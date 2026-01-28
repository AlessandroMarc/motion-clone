'use client';

import { useMemo } from 'react';
import type {
  CalendarEventTask,
  CalendarEventUnion,
  Task,
  CalendarEvent,
} from '@/types';
import { isCalendarEventTask } from '@/types';
import {
  createConfigFromSchedule,
  prepareTaskEvents,
  sortTasksForScheduling,
  type TaskSchedulingConfig,
} from '@/utils/taskScheduler';
import type { Schedule } from '@/types';

const DEBUG = process.env.NODE_ENV === 'development';
function log(...args: unknown[]) {
  if (DEBUG) {
    console.log('[AutoSchedulePreview]', ...args);
  }
}

type TaskEventBlock = {
  task: Task;
  events: Array<{ start_time: Date; end_time: Date }>;
  violations: Array<{ start_time: Date; end_time: Date }>;
};

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

export function useAutoSchedulePreview(params: {
  tasks: Task[];
  existingEvents: CalendarEventTask[];
  allCalendarEvents: CalendarEventUnion[];
  activeSchedule: Schedule | null;
  eventDuration: number;
}) {
  const {
    tasks,
    existingEvents,
    allCalendarEvents,
    activeSchedule,
    eventDuration,
  } = params;

  return useMemo(() => {
    log('--- run ---', {
      tasksCount: tasks.length,
      existingEventsCount: existingEvents.length,
      allCalendarEventsCount: allCalendarEvents.length,
      eventDuration,
      activeSchedule: activeSchedule
        ? {
            working_hours_start: activeSchedule.working_hours_start,
            working_hours_end: activeSchedule.working_hours_end,
          }
        : null,
    });

    // Include all non-completed tasks so the user sees their full list.
    // Tasks with no remaining duration (actual >= planned) or planned === 0
    // will get 0 new events but still appear in the list.
    const incompleteTasks = tasks.filter(task => task.status !== 'completed');
    log('incompleteTasks', incompleteTasks.length, '(status !== "completed")');

    const sortedTasks = sortTasksForScheduling(incompleteTasks);
    log('sortedTasks', sortedTasks.length);

    const tasksWithDeadlineCount = sortedTasks.filter(
      t => t.due_date !== null
    ).length;
    const tasksWithoutDeadlineCount = sortedTasks.filter(
      t => t.due_date === null
    ).length;
    log('by deadline', { tasksWithDeadlineCount, tasksWithoutDeadlineCount });

    const config: TaskSchedulingConfig = createConfigFromSchedule(
      activeSchedule,
      eventDuration
    );

    const completedTaskEvents = allCalendarEvents.filter(
      event => isCalendarEventTask(event) && event.completed_at !== null
    );
    const regularEvents = allCalendarEvents.filter(
      event => !isCalendarEventTask(event)
    );

    const accumulatedScheduledEvents: CalendarEventUnion[] = [
      ...regularEvents,
      ...completedTaskEvents,
    ];

    const taskEvents: TaskEventBlock[] = [];
    // Start from schedule's working hours start, or current time if later
    const now = new Date();
    const workingHoursStart = new Date(now);
    workingHoursStart.setHours(config.workingHoursStart, 0, 0, 0);
    workingHoursStart.setSeconds(0);
    workingHoursStart.setMilliseconds(0);

    // Use the later of: working hours start or current time (rounded to next 15 min)
    const roundedNow = roundToNext15Minutes(now);
    let currentStartTime =
      roundedNow > workingHoursStart ? roundedNow : workingHoursStart;
    log('scheduling window', {
      now: now.toISOString(),
      roundedNow: roundedNow.toISOString(),
      workingHoursStart: workingHoursStart.toISOString(),
      currentStartTime: currentStartTime.toISOString(),
    });

    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      const taskExistingEvents = existingEvents.filter(
        event => event.linked_task_id === task.id && event.completed_at !== null
      );

      const { events, violations } = prepareTaskEvents(
        task,
        taskExistingEvents,
        config,
        accumulatedScheduledEvents,
        currentStartTime
      );

      // Always include the task so the user sees it. Tasks with 0 events
      // (e.g. already fully scheduled or planned duration 0) still appear.
      taskEvents.push({ task, events, violations });

      log(`task[${i + 1}/${sortedTasks.length}]`, {
        id: task.id,
        title: task.title.slice(0, 30),
        status: task.status,
        planned_duration_minutes: task.planned_duration_minutes,
        actual_duration_minutes: task.actual_duration_minutes,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        taskExistingEventsCount: taskExistingEvents.length,
        eventsCount: events.length,
        violationsCount: violations.length,
        currentStartTimeBefore: currentStartTime.toISOString(),
      });

      for (const event of events) {
        const tempEvent: CalendarEvent = {
          id: `temp-${task.id}-${event.start_time.getTime()}`,
          title: task.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: task.description,
          user_id: task.user_id,
          created_at: new Date(),
          updated_at: new Date(),
        };
        accumulatedScheduledEvents.push(tempEvent);
      }

      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        currentStartTime = new Date(lastEvent.end_time);
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 5);
        log(`  -> next currentStartTime`, currentStartTime.toISOString());
      }
    }

    const totalEvents = taskEvents.reduce(
      (sum, te) => sum + te.events.length,
      0
    );
    const totalViolations = taskEvents.reduce(
      (sum, te) => sum + te.violations.length,
      0
    );

    log('--- result ---', {
      taskEventsCount: taskEvents.length,
      totalEvents,
      totalViolations,
      tasksWithDeadlineCount,
      tasksWithoutDeadlineCount,
    });

    return {
      taskEvents,
      totalEvents,
      totalViolations,
      tasksWithDeadlineCount,
      tasksWithoutDeadlineCount,
    };
  }, [tasks, existingEvents, allCalendarEvents, activeSchedule, eventDuration]);
}
