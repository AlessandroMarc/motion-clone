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
  const sortedTasks = sortTasksForScheduling(incompleteTasks);

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

  for (const task of sortedTasks) {
    const taskSchedule =
      (task.schedule_id ? scheduleMap.get(task.schedule_id) : undefined) ??
      activeSchedule;
    const taskConfig = createConfigFromSchedule(taskSchedule ?? null, eventDuration);
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

    // Add kept future events as blockers BEFORE generating new events so new
    // slots won't overlap with them.
    for (const evt of futureValidEvents) {
      accumulatedScheduledEvents.push(evt);
    }

    let taskStartTime = new Date(taskBaseStartTime);

    // Respect task start_date for the scheduling origin
    if (taskStartDate && taskStartTime < taskStartDate) {
      const startDateWorking = new Date(taskStartDate);
      startDateWorking.setHours(taskConfig.workingHoursStart, 0, 0, 0);
      taskStartTime = startDateWorking > taskBaseStartTime
        ? startDateWorking
        : taskStartTime;
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

    const { events, violations } = prepareTaskEvents(
      task,
      futureValidEvents,
      taskConfig,
      accumulatedScheduledEvents,
      taskStartTime
    );

    // Combine kept future events with newly generated events
    const keptSlots = futureValidEvents.map(e => ({
      start_time: new Date(e.start_time),
      end_time: new Date(e.end_time),
    }));
    const finalEvents = [...keptSlots, ...events].sort(
      (a, b) => a.start_time.getTime() - b.start_time.getTime()
    );

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
