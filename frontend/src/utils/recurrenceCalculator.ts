/**
 * Frontend recurrence utilities for expanding recurring tasks into calendar events
 * Mirrors backend recurrenceCalculator.ts but tailored for frontend autoSchedule
 */

import type { Task, CalendarEventTask } from '@/types';

/**
 * Calculate the next occurrence date based on recurrence pattern and interval
 */
export function calculateNextOccurrence(
  date: Date,
  pattern: string,
  interval: number
): Date {
  const next = new Date(date);

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;

    case 'monthly': {
      const originalDate = date.getDate();
      next.setMonth(next.getMonth() + interval);

      // Handle month-end overflow
      const lastDayOfMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();
      if (originalDate > lastDayOfMonth) {
        next.setDate(lastDayOfMonth);
      } else {
        next.setDate(originalDate);
      }
      break;
    }

    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`);
  }

  return next;
}

/**
 * Generate occurrence dates for a recurring task within a 90-day horizon
 */
export function generateOccurrenceDates(
  startDate: Date,
  pattern: string,
  interval: number,
  horizonEnd: Date
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);

  // Normalize to start of day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(horizonEnd);
  end.setHours(23, 59, 59, 999);

  // Generate occurrences
  while (currentDate <= end) {
    if (currentDate >= start) {
      occurrences.push(new Date(currentDate));
    }
    currentDate = calculateNextOccurrence(currentDate, pattern, interval);
  }

  return occurrences;
}

/**
 * Get the 90-day horizon end date from now
 */
export function get90DayHorizon(): Date {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  horizon.setHours(23, 59, 59, 999);
  return horizon;
}

/**
 * Create synthetic calendar events for recurring task occurrences
 * These won't be persisted to the be but serve as placeholders for scheduling
 */
export function generateSyntheticRecurringEvents(
  task: Task,
  existingEvents: CalendarEventTask[]
): CalendarEventTask[] {
  if (!task.is_recurring || !task.recurrence_pattern) {
    return [];
  }

  const syntheticEvents: CalendarEventTask[] = [];
  const occurrenceDates = generateOccurrenceDates(
    task.next_generation_cutoff || task.due_date || new Date(),
    task.recurrence_pattern,
    task.recurrence_interval || 1,
    get90DayHorizon()
  );

  for (const occurrenceDate of occurrenceDates) {
    // Skip if we already have an event for this date (don't duplicate)
    const existingForDate = existingEvents.some(
      e =>
        e.linked_task_id === task.id &&
        e.start_time.toDateString() === occurrenceDate.toDateString()
    );

    if (!existingForDate) {
      const syntheticEvent: CalendarEventTask = {
        id: `synthetic-${task.id}-${occurrenceDate.getTime()}`,
        linked_task_id: task.id,
        title: task.title,
        description: task.description,
        start_time: occurrenceDate,
        end_time: occurrenceDate,
        user_id: task.user_id,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      syntheticEvents.push(syntheticEvent);
    }
  }

  return syntheticEvents;
}

/**
 * Expand all recurring tasks by generating synthetic events for them
 * This should be called before running calculateAutoSchedule
 */
export function expandRecurringTasks(
  tasks: Task[],
  existingTaskEvents: CalendarEventTask[]
): CalendarEventTask[] {
  const syntheticEvents: CalendarEventTask[] = [];

  for (const task of tasks) {
    if (task.is_recurring && task.recurrence_pattern) {
      const taskExistingEvents = existingTaskEvents.filter(
        e => e.linked_task_id === task.id
      );
      const taskSyntheticEvents = generateSyntheticRecurringEvents(
        task,
        taskExistingEvents
      );
      syntheticEvents.push(...taskSyntheticEvents);
    }
  }

  return syntheticEvents;
}
