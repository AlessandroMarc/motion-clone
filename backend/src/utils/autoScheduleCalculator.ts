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

  const pendingTaskEvents = existingEvents.filter(
    e => !e.id.startsWith('synthetic-') && e.completed_at === null
  );

  const accumulatedScheduledEvents: CalendarEventUnion[] = [
    ...regularEvents,
    ...completedTaskEvents,
    ...syntheticEvents,
    ...pendingTaskEvents,
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

    let taskStartTime = new Date(taskBaseStartTime);
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
      effectiveExistingEvents,
      taskConfig,
      accumulatedScheduledEvents,
      taskStartTime
    );

    const finalEvents =
      events.length === 0 && effectiveExistingEvents.length > 0
        ? effectiveExistingEvents.map(e => ({
            task_id: task.id,
            start_time: new Date(e.start_time),
            end_time: new Date(e.end_time),
          }))
        : events;

    taskEvents.push({ task, events: finalEvents, violations });

    for (const event of finalEvents) {
      // Push a minimal placeholder so subsequent tasks avoid this slot
      const tempEvent: CalendarEventUnion = {
        id: `temp-${task.id}-${event.start_time.getTime()}`,
        title: task.title,
        start_time: event.start_time,
        end_time: event.end_time,
        user_id: task.user_id,
        created_at: new Date(),
        updated_at: new Date(),
        // CalendarEvent fields (non-task variant — no linked_task_id / completed_at)
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
