import type { SupabaseClient } from '@supabase/supabase-js';
import { CalendarEventService } from './calendarEventService.js';
import { UserSettingsService } from './userSettingsService.js';
import { AutoScheduleService } from './autoScheduleService.js';
import { TaskService } from './taskService.js';
import { isCalendarEventTask } from '../types/database.js';
import type { CalendarEventTask, CalendarEventUnion, Task } from '../types/database.js';
import { calculateAutoSchedule } from '../utils/autoScheduleCalculator.js';
import { expandRecurringTasks } from '../utils/recurrenceCalculator.js';

const calendarEventService = new CalendarEventService();
const userSettingsService = new UserSettingsService();
const autoScheduleService = new AutoScheduleService();
const taskService = new TaskService();

/**
 * Parse workingEnd (may be fractional, e.g. 17.5 for 5:30 PM) into "HH:MM".
 */
export function workingEndToTimeString(workingEnd: number): string {
  const hours = Math.floor(workingEnd);
  const minutes = Math.round((workingEnd - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Build a local-timezone Date from a "YYYY-MM-DD" date string and "HH:MM" time string.
 * Using explicit year/month/day/hour/minute avoids the UTC-midnight trap of new Date(dateStr).
 */
export function buildLocalDateTime(dateStr: string, timeStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minuteStr] = timeStr.split(':');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // Date months are 0-based
  const day = Number(dayStr);
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  return new Date(year, month, day, hours, minutes, 0, 0);
}

export interface DayBlockSimulateResult {
  tasksToMove: Array<{
    task: Task;
    currentEvent: CalendarEventTask;
    proposedTime: { start: Date; end: Date } | null;
  }>;
  totalEventsCreated: number;
  totalEventsDeleted: number;
  violations: number;
  /** ISO string of the computed block end time (for accurate display on the client). */
  blockEndTime: string;
  /**
   * True when the schedule explicitly marks this day as non-working (working_days[dow] === null).
   * Tasks are never auto-scheduled on non-working days, so blocking is a no-op but worth
   * surfacing to the user as a warning.
   */
  isNonWorkingDay: boolean;
}

export class DayBlockService {
  /**
   * Resolve start/end times for a day block given a date string, from_time, and the
   * user's active schedule.
   *
   * Returns `{ startTime, endTime, isNonWorkingDay }` on success or `{ error }` if
   * the working day is already over for the requested window.
   *
   * `isNonWorkingDay` is true when `working_days[dayOfWeek] === null`, meaning the
   * schedule explicitly marks this day as a non-working day. Tasks won't be scheduled
   * there anyway, so blocking it is harmless but worth surfacing to the user.
   */
  async resolveTimes(
    userId: string,
    authToken: string,
    dateStr: string,
    fromTimeStr: string
  ): Promise<{ startTime: Date; endTime: Date; isNonWorkingDay: boolean } | { error: string }> {
    const startTime = buildLocalDateTime(dateStr, fromTimeStr);

    const schedule = await userSettingsService.getActiveSchedule(userId, authToken);
    const dayOfWeek = startTime.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySchedule = schedule?.working_days?.[dayOfWeek];

    // daySchedule === null  → explicitly non-working day
    // daySchedule === undefined → no per-day config, use global hours
    const isNonWorkingDay = daySchedule === null;

    const workingEnd =
      (daySchedule != null ? daySchedule.end : undefined) ??
      schedule?.working_hours_end ??
      18;

    const endTimeStr = workingEndToTimeString(workingEnd);
    const endTime = buildLocalDateTime(dateStr, endTimeStr);

    if (startTime >= endTime) {
      return { error: 'The chosen time is at or after the end of your working hours' };
    }

    return { startTime, endTime, isNonWorkingDay };
  }

  /**
   * Find an existing day block that overlaps the proposed window.
   * Returns it if found (signals a duplicate / conflict).
   */
  async findOverlappingDayBlock(
    authToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEventUnion | null> {
    const allEvents = await calendarEventService.getAllCalendarEvents(authToken);
    const hit = allEvents.find(e => {
      if (!(e as { is_day_block?: boolean }).is_day_block) return false;
      const eStart = new Date(e.start_time as unknown as string).getTime();
      const eEnd = new Date(e.end_time as unknown as string).getTime();
      return eStart < endTime.getTime() && eEnd > startTime.getTime();
    });
    return hit ?? null;
  }

  /**
   * Simulate auto-schedule with a hypothetical day-block, returning which task
   * events would be moved and where.
   */
  async simulate(
    client: SupabaseClient,
    userId: string,
    authToken: string,
    startTime: Date,
    endTime: Date,
    isNonWorkingDay = false
  ): Promise<DayBlockSimulateResult> {
    const [allTasks, allEvents] = await Promise.all([
      taskService.getAllTasks(client),
      calendarEventService.getAllCalendarEvents(authToken),
    ]);

    // Inject the hypothetical day-block into the event list
    const hypotheticalDayBlock = {
      id: 'hypothetical-day-block',
      title: 'Day blocked',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_day_block: true,
      synced_from_google: false,
      linked_task_id: null as string | null,
      completed_at: null as Date | null,
      recurrence_id: null as string | null,
      recurrence_date: null as Date | null,
      google_event_id: null as string | null,
      description: null as string | null,
    };
    const eventsWithBlock = [...allEvents, hypotheticalDayBlock] as CalendarEventUnion[];

    const [schedules, activeSchedule] = await Promise.all([
      userSettingsService.getUserSchedules(userId, authToken),
      userSettingsService.getActiveSchedule(userId, authToken),
    ]);

    // Pass ALL task events (including completed) to expandRecurringTasks so already-
    // completed occurrences are not re-generated.
    const recurringTaskSyntheticEvents = expandRecurringTasks(
      allTasks.filter(t => t.is_recurring && t.status !== 'completed'),
      allEvents.filter(e => isCalendarEventTask(e)) as CalendarEventTask[]
    );

    const allTaskEventsForScheduling = [
      ...(allEvents.filter(
        e => isCalendarEventTask(e) && !(e as CalendarEventTask).completed_at
      ) as CalendarEventTask[]),
      ...recurringTaskSyntheticEvents,
    ];

    const { taskEvents, totalViolations } = calculateAutoSchedule({
      tasks: allTasks.filter(t => t.status !== 'completed' && !t.is_reminder),
      existingEvents: allTaskEventsForScheduling,
      allCalendarEvents: eventsWithBlock,
      activeSchedule,
      eventDuration: 60,
      schedules,
    });

    const currentTaskEvents = allEvents.filter(
      e => isCalendarEventTask(e) && !(e as CalendarEventTask).completed_at
    ) as CalendarEventTask[];

    // Group current events by task
    const currentByTask = new Map<string, CalendarEventTask[]>();
    for (const evt of currentTaskEvents) {
      const list = currentByTask.get(evt.linked_task_id) || [];
      list.push(evt);
      currentByTask.set(evt.linked_task_id, list);
    }

    // Group proposed events by task
    const proposedByTask = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const { task, events: evts } of taskEvents) {
      proposedByTask.set(
        task.id,
        evts.map(e => ({ start: e.start_time, end: e.end_time }))
      );
    }

    const taskMap = new Map<string, Task>();
    for (const task of allTasks) {
      taskMap.set(task.id, task);
    }

    const blockStart = startTime.getTime();
    const blockEnd = endTime.getTime();

    const tasksToMove: DayBlockSimulateResult['tasksToMove'] = [];

    for (const [taskId, currentEvents] of currentByTask) {
      const task = taskMap.get(taskId);
      if (!task) continue;

      // Sort current events by start time so chunk indices align with the scheduler's output
      const sortedCurrent = [...currentEvents].sort(
        (a, b) =>
          new Date(a.start_time as unknown as string).getTime() -
          new Date(b.start_time as unknown as string).getTime()
      );
      const proposedEvents = proposedByTask.get(taskId) ?? [];

      for (let i = 0; i < sortedCurrent.length; i++) {
        const currentEvt = sortedCurrent[i]!;
        const currentStart = new Date(currentEvt.start_time as unknown as string).getTime();
        const currentEnd = new Date(currentEvt.end_time as unknown as string).getTime();
        const isBlocked = currentStart < blockEnd && currentEnd > blockStart;
        if (!isBlocked) continue;

        // Use the same-index proposed event to keep chunk correspondence stable
        const proposed = proposedEvents[i] ?? null;
        tasksToMove.push({ task, currentEvent: currentEvt, proposedTime: proposed });
      }
    }

    // Count net schedule changes
    const currentKeys = new Set(
      currentTaskEvents.map(e => `${e.linked_task_id}|${e.start_time}|${e.end_time}`)
    );
    const proposedKeys = new Set(
      taskEvents.flatMap(({ task: t, events: evts }) =>
        evts.map(e => `${t.id}|${e.start_time.toISOString()}|${e.end_time.toISOString()}`)
      )
    );

    let eventsCreated = 0;
    let eventsDeleted = 0;
    for (const key of proposedKeys) {
      if (!currentKeys.has(key)) eventsCreated++;
    }
    for (const key of currentKeys) {
      if (!proposedKeys.has(key)) eventsDeleted++;
    }

    return {
      tasksToMove,
      totalEventsCreated: eventsCreated,
      totalEventsDeleted: eventsDeleted,
      violations: totalViolations,
      blockEndTime: endTime.toISOString(),
      isNonWorkingDay,
    };
  }

  /**
   * Create a day-block event and immediately re-run auto-schedule.
   */
  async create(
    userId: string,
    authToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    dayBlock: CalendarEventUnion;
    scheduleResult: Awaited<ReturnType<typeof autoScheduleService.run>>;
  }> {
    const dayBlock = await calendarEventService.createCalendarEvent(
      {
        title: 'Day blocked',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        user_id: userId,
        is_day_block: true,
      },
      undefined,
      authToken
    );

    const scheduleResult = await autoScheduleService.run(userId, authToken);

    return { dayBlock, scheduleResult };
  }
}
