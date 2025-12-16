'use client';

import { useMemo } from 'react';
import type { CalendarEventTask, CalendarEventUnion, Task, CalendarEvent } from '@/../../../shared/types';
import { isCalendarEventTask } from '@/../../../shared/types';
import {
  createConfigFromSchedule,
  prepareTaskEvents,
  sortTasksForScheduling,
  type TaskSchedulingConfig,
} from '@/utils/taskScheduler';
import type { Schedule } from '@/../../../shared/types';
import { logger } from '@/lib/logger';

type TaskEventBlock = {
  task: Task;
  events: Array<{ start_time: Date; end_time: Date }>;
  violations: Array<{ start_time: Date; end_time: Date }>;
};

function roundToNext15Minutes(date: Date): Date {
  const startFrom = new Date(date);
  const minutes = startFrom.getMinutes();
  const remainder = minutes % 15;
  startFrom.setMinutes(remainder === 0 ? minutes + 15 : minutes + (15 - remainder));
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
  const { tasks, existingEvents, allCalendarEvents, activeSchedule, eventDuration } = params;

  return useMemo(() => {
    const incompleteTasks = tasks.filter(
      task =>
        task.status !== 'completed' &&
        (task.actual_duration_minutes ?? 0) < task.planned_duration_minutes
    );

    const sortedTasks = sortTasksForScheduling(incompleteTasks);

    const tasksWithDeadlineCount = sortedTasks.filter(t => t.due_date !== null).length;
    const tasksWithoutDeadlineCount = sortedTasks.filter(t => t.due_date === null).length;

    const config: TaskSchedulingConfig = createConfigFromSchedule(activeSchedule, eventDuration);

    const completedTaskEvents = allCalendarEvents.filter(
      event => isCalendarEventTask(event) && event.completed_at !== null
    );
    const regularEvents = allCalendarEvents.filter(event => !isCalendarEventTask(event));

    logger.debug('[AutoScheduleDialog] Using regular+completed events as blockers', {
      totalEvents: allCalendarEvents.length,
      regularEvents: regularEvents.length,
      completedTaskEvents: completedTaskEvents.length,
    });

    const accumulatedScheduledEvents: CalendarEventUnion[] = [
      ...regularEvents,
      ...completedTaskEvents,
    ];

    const taskEvents: TaskEventBlock[] = [];
    let currentStartTime = roundToNext15Minutes(new Date());

    for (const task of sortedTasks) {
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

      if (events.length === 0) continue;

      taskEvents.push({ task, events, violations });

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

      const lastEvent = events[events.length - 1];
      currentStartTime = new Date(lastEvent.end_time);
      currentStartTime.setMinutes(currentStartTime.getMinutes() + 5);
    }

    const totalEvents = taskEvents.reduce((sum, te) => sum + te.events.length, 0);
    const totalViolations = taskEvents.reduce((sum, te) => sum + te.violations.length, 0);

    return {
      taskEvents,
      totalEvents,
      totalViolations,
      tasksWithDeadlineCount,
      tasksWithoutDeadlineCount,
    };
  }, [tasks, existingEvents, allCalendarEvents, activeSchedule, eventDuration]);
}


