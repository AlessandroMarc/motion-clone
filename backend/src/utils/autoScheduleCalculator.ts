/**
 * Auto-schedule calculator — backend port of
 * frontend/src/utils/autoScheduleCalculator.ts
 */

import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
} from '../types/database.js';
import { isCalendarEventTask } from '../types/database.js';
import {
  createConfigFromSchedule,
  prepareTaskEvents,
  sortTasksForScheduling,
} from './taskScheduler.js';

export interface TaskEventBlock {
  task: Task;
  events: Array<{ start_time: Date; end_time: Date }>;
  violations: Array<{ start_time: Date; end_time: Date }>;
}

export interface AutoScheduleResult {
  taskEvents: TaskEventBlock[];
  totalEvents: number;
  totalViolations: number;
  tasksWithDeadlineCount: number;
  tasksWithoutDeadlineCount: number;
}

function roundToNext15Minutes(date: Date): Date {
  const startFrom = new Date(date);
  const minutes = startFrom.getMinutes();
  const remainder = minutes % 15;
  startFrom.setMinutes(
    remainder === 0 ? minutes + 15 : minutes + (15 - remainder)
  );
  startFrom.setSeconds(0);
  startFrom.setMilliseconds(0);
  return startFrom;
}

function reorderTasksForContinuation(
  baseOrder: Task[],
  tasksWithUpcomingEvents: Set<string>
): Task[] {
  const remaining = [...baseOrder];
  const scheduled = new Set<string>();
  const ordered: Task[] = [];

  while (remaining.length > 0) {
    const readyIndices: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const task = remaining[i];
      if (!task) continue;
      const blockers = (task.blockedBy ?? []).filter(id =>
        baseOrder.some(t => t.id === id)
      );
      const isReady = blockers.every(id => scheduled.has(id));
      if (isReady) readyIndices.push(i);
    }

    if (readyIndices.length === 0) {
      ordered.push(...remaining);
      break;
    }

    const continuationIdx = readyIndices.find(idx => {
      const task = remaining[idx];
      return task ? tasksWithUpcomingEvents.has(task.id) : false;
    });

    const pickedIdx = continuationIdx ?? readyIndices[0] ?? 0;
    const [pickedTask] = remaining.splice(pickedIdx, 1);
    if (!pickedTask) continue;

    ordered.push(pickedTask);
    scheduled.add(pickedTask.id);
  }

  return ordered;
}

export function calculateAutoSchedule(params: {
  tasks: Task[];
  existingEvents: CalendarEventTask[];
  allCalendarEvents: CalendarEventUnion[];
  activeSchedule: Schedule | null;
  eventDuration: number;
  schedules?: Schedule[];
}): AutoScheduleResult {
  const {
    tasks,
    existingEvents,
    allCalendarEvents,
    activeSchedule,
    eventDuration,
    schedules = [],
  } = params;

  const incompleteTasks = tasks.filter(task => task.status !== 'completed');
  console.log(
    `[AutoSchedule:calc] ${tasks.length} total tasks, ${incompleteTasks.length} incomplete`
  );
  const baseSortedTasks = sortTasksForScheduling(incompleteTasks);

  const orderingNowMs = Date.now();
  const tasksWithUpcomingEvents = new Set(
    existingEvents
      .filter(
        e =>
          !e.id.startsWith('synthetic-') &&
          new Date(e.end_time).getTime() > orderingNowMs
      )
      .map(e => e.linked_task_id)
  );

  const sortedTasks = reorderTasksForContinuation(
    baseSortedTasks,
    tasksWithUpcomingEvents
  );

  const tasksWithDeadlineCount = sortedTasks.filter(
    t => t.due_date !== null
  ).length;
  const tasksWithoutDeadlineCount = sortedTasks.filter(
    t => t.due_date === null
  ).length;

  const scheduleMap = new Map<string, Schedule>(schedules.map(s => [s.id, s]));

  const completedTaskEvents = allCalendarEvents.filter(
    event => isCalendarEventTask(event) && event.completed_at !== null
  );
  const regularEvents = allCalendarEvents.filter(
    event => !isCalendarEventTask(event)
  );

  const syntheticEvents = existingEvents.filter(e =>
    e.id.startsWith('synthetic-')
  );

  // Existing pending task events are NOT included in the initial blocking pool.
  // Including them caused tasks with deadlines to be blocked by old auto-scheduled
  // events for no-deadline tasks from the previous run, pushing deadline tasks
  // past their due date.  Instead, each task's proposed events are added to the
  // pool dynamically as it is processed (in deadline-first sort order), so
  // higher-priority / deadline tasks always get first pick of available slots.
  const accumulatedScheduledEvents: CalendarEventUnion[] = [
    ...regularEvents,
    ...completedTaskEvents,
    ...syntheticEvents,
  ];

  const taskEvents: TaskEventBlock[] = [];
  const now = new Date();
  const roundedNow = roundToNext15Minutes(now);

  const taskLatestEndTime = new Map<string, Date>();
  const lastScheduledTaskId = { id: '' }; // Track which task was scheduled last
  const smallGapMs = 2 * 60 * 1000; // 2-minute gap for consecutive occurrences of same task

  for (const task of sortedTasks) {
    const taskSchedule =
      (task.schedule_id ? scheduleMap.get(task.schedule_id) : undefined) ??
      activeSchedule;
    const taskConfig = createConfigFromSchedule(
      taskSchedule ?? null,
      eventDuration
    );
    const gapMs = (taskConfig.gapBetweenEventsMinutes ?? 5) * 60 * 1000;

    const taskWorkingHoursStart = new Date(now);
    taskWorkingHoursStart.setHours(taskConfig.workingHoursStart, 0, 0, 0);
    taskWorkingHoursStart.setSeconds(0);
    taskWorkingHoursStart.setMilliseconds(0);
    const taskBaseStartTime =
      roundedNow > taskWorkingHoursStart ? roundedNow : taskWorkingHoursStart;

    const taskExistingEvents = existingEvents.filter(
      event =>
        event.linked_task_id === task.id && !event.id.startsWith('synthetic-')
    );

    const overlappingEventIds = new Set<string>();
    for (const taskEvent of taskExistingEvents) {
      const teStart = new Date(taskEvent.start_time).getTime();
      const teEnd = new Date(taskEvent.end_time).getTime();
      const overlapsOther = accumulatedScheduledEvents.some(other => {
        if (!other) return false;
        if (isCalendarEventTask(other) && other.linked_task_id === task.id) {
          return false;
        }
        const oStart = new Date(other.start_time).getTime();
        const oEnd = new Date(other.end_time).getTime();
        return teStart < oEnd && teEnd > oStart;
      });
      if (overlapsOther) {
        overlappingEventIds.add(taskEvent.id);
      }
    }

    let effectiveExistingEvents = taskExistingEvents;
    if (overlappingEventIds.size > 0) {
      effectiveExistingEvents = taskExistingEvents.filter(
        e => !overlappingEventIds.has(e.id)
      );
      for (let ai = accumulatedScheduledEvents.length - 1; ai >= 0; ai--) {
        const acc = accumulatedScheduledEvents[ai];
        if (
          acc &&
          isCalendarEventTask(acc) &&
          acc.linked_task_id === task.id &&
          overlappingEventIds.has(acc.id)
        ) {
          accumulatedScheduledEvents.splice(ai, 1);
        }
      }
    }

    // ── Filter out invalid existing events ──────────────────────────────
    // 1. Past uncompleted events → their time needs replanning
    // 2. Events before the task's start_date → should never have been placed
    // Only futureValidEvents count toward "already scheduled" time; the
    // reclaimed time will be filled with new optimally-placed events.
    const nowMs = now.getTime();
    const taskStartDate = task.start_date ? new Date(task.start_date) : null;
    if (taskStartDate) taskStartDate.setHours(0, 0, 0, 0);

    const futureValidEvents = effectiveExistingEvents.filter(e => {
      if (new Date(e.end_time).getTime() <= nowMs) return false;
      if (taskStartDate && new Date(e.start_time) < taskStartDate) return false;
      return true;
    });

    // Reflow policy for non-recurring tasks:
    // Do not treat existing future pending task events as fixed placements.
    // They should be recomputed on each run so remaining chunks can move earlier
    // (for example, to continue the same task before unrelated tasks).
    // Recurring tasks keep their dated occurrences stable.
    const lockedFutureEvents = task.is_recurring ? futureValidEvents : [];

    // Add kept future events as blockers BEFORE generating new events so new
    // slots won't overlap with them.
    for (const evt of lockedFutureEvents) {
      accumulatedScheduledEvents.push(evt);
    }

    let taskStartTime = new Date(taskBaseStartTime);

    // Respect task start_date for the scheduling origin
    if (taskStartDate && taskStartTime < taskStartDate) {
      const startDateWorking = new Date(taskStartDate);
      startDateWorking.setHours(taskConfig.workingHoursStart, 0, 0, 0);
      taskStartTime =
        startDateWorking > taskBaseStartTime ? startDateWorking : taskStartTime;
    }

    const blockers = (task.blockedBy ?? []).filter(id =>
      taskLatestEndTime.has(id)
    );

    if (blockers.length > 0) {
      for (const blockerId of blockers) {
        const blockerEnd = taskLatestEndTime.get(blockerId);
        if (blockerEnd) {
          const blockerEndPlusGap = new Date(blockerEnd.getTime() + gapMs);
          if (blockerEndPlusGap > taskStartTime) {
            taskStartTime = blockerEndPlusGap;
          }
        }
      }
    }

    // If this task is the same as the last scheduled task, use smaller gap (2 min)
    // to keep multiple occurrences of the same task grouped together
    if (lastScheduledTaskId.id === task.id) {
      const lastTaskEnd = taskLatestEndTime.get(task.id);
      if (lastTaskEnd) {
        const startWithSmallGap = new Date(lastTaskEnd.getTime() + smallGapMs);
        if (startWithSmallGap > taskStartTime) {
          taskStartTime = startWithSmallGap;
        }
      }
    }

    const { events, violations } = prepareTaskEvents(
      task,
      lockedFutureEvents,
      taskConfig,
      accumulatedScheduledEvents,
      taskStartTime
    );

    // Combine kept future events with newly generated events
    const keptSlots = lockedFutureEvents.map(e => ({
      start_time: new Date(e.start_time),
      end_time: new Date(e.end_time),
    }));
    const finalEvents = [...keptSlots, ...events].sort(
      (a, b) => a.start_time.getTime() - b.start_time.getTime()
    );

    if (finalEvents.length === 0 && task.status !== 'completed') {
      const resolvedScheduleId = taskSchedule?.id ?? activeSchedule?.id ?? null;
      console.log(
        `[AutoSchedule:calc] Task "${task.title}" (${task.id}) scheduled 0 events:`,
        {
          status: task.status,
          planned: task.planned_duration_minutes,
          actual: task.actual_duration_minutes,
          due_date: task.due_date,
          start_date: task.start_date,
          task_schedule_id: task.schedule_id,
          resolved_schedule_id: resolvedScheduleId,
          schedule_hours: {
            start: taskConfig.workingHoursStart,
            end: taskConfig.workingHoursEnd,
          },
          has_working_days: !!taskConfig.workingDays,
          lockedEvents: lockedFutureEvents.length,
          newEvents: events.length,
          violations: violations.length,
        }
      );
    }

    taskEvents.push({ task, events: finalEvents, violations });

    // Only add NEW events to the accumulated pool (kept events were added above)
    for (const event of events) {
      const tempEvent: CalendarEventUnion = {
        id: `temp-${task.id}-${event.start_time.getTime()}`,
        title: task.title,
        start_time: event.start_time,
        end_time: event.end_time,
        user_id: task.user_id,
        created_at: new Date(),
        updated_at: new Date(),
      } as CalendarEventUnion;
      accumulatedScheduledEvents.push(tempEvent);
    }

    const lastEvent = finalEvents[finalEvents.length - 1];
    if (lastEvent) {
      taskLatestEndTime.set(task.id, lastEvent.end_time);
      lastScheduledTaskId.id = task.id; // Track that we just scheduled this task
    }
  }

  const totalEvents = taskEvents.reduce((sum, te) => sum + te.events.length, 0);
  const totalViolations = taskEvents.reduce(
    (sum, te) => sum + te.violations.length,
    0
  );

  return {
    taskEvents,
    totalEvents,
    totalViolations,
    tasksWithDeadlineCount,
    tasksWithoutDeadlineCount,
  };
}
