import { describe, expect, it, jest } from '@jest/globals';
import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
} from '../../types/database.js';
import { calculateAutoSchedule } from '../autoScheduleCalculator.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: '',
    due_date: null,
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date('2026-03-01T10:00:00.000Z'),
    updated_at: new Date('2026-03-01T10:00:00.000Z'),
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    schedule_id: null,
    start_date: null,
    is_recurring: false,
    recurrence_pattern: undefined,
    recurrence_interval: 1,
    recurrence_start_date: null,
    next_generation_cutoff: null,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    name: 'Default',
    working_hours_start: 9,
    working_hours_end: 18,
    working_days: {
      0: { start: 9, end: 18 },
      1: { start: 9, end: 18 },
      2: { start: 9, end: 18 },
      3: { start: 9, end: 18 },
      4: { start: 9, end: 18 },
      5: { start: 9, end: 18 },
      6: { start: 9, end: 18 },
    },
    is_default: true,
    created_at: new Date('2026-03-01T00:00:00.000Z'),
    updated_at: new Date('2026-03-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeTaskEvent(
  overrides: Partial<CalendarEventTask> = {}
): CalendarEventTask {
  return {
    id: 'event-1',
    title: 'Task Event',
    start_time: new Date('2026-03-16T10:00:00.000Z'),
    end_time: new Date('2026-03-16T11:00:00.000Z'),
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    linked_task_id: 'completed-task',
    completed_at: null,
    ...overrides,
  };
}

describe('calculateAutoSchedule', () => {
  it('should not block time slots occupied by completed task events', () => {
    // Freeze time to a deterministic morning timestamp to avoid flakiness
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T09:30:00.000Z'));

    try {
      // A completed task has an event from 10:00-11:00
      const completedEvent = makeTaskEvent({
        id: 'completed-event-1',
        title: 'Completed Task',
        start_time: new Date('2026-03-16T10:00:00.000Z'),
        end_time: new Date('2026-03-16T11:00:00.000Z'),
        linked_task_id: 'completed-task',
        completed_at: new Date('2026-03-16T10:30:00.000Z'),
      });

      // An incomplete task needs to be scheduled (60 min)
      const incompleteTask = makeTask({
        id: 'incomplete-task',
        title: 'Incomplete Task',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
      });

      const schedule = makeSchedule();

      const result = calculateAutoSchedule({
        tasks: [incompleteTask],
        existingEvents: [],
        allCalendarEvents: [completedEvent] as CalendarEventUnion[],
        activeSchedule: schedule,
        eventDuration: 60,
        schedules: [schedule],
      });

      // The incomplete task should be scheduled
      expect(result.taskEvents.length).toBe(1);
      expect(result.taskEvents[0]!.events.length).toBeGreaterThan(0);

      // The scheduled event should be allowed to overlap with the completed event's
      // time slot (10:00-11:00) since it's freed up. It should start at or near
      // the current time rounded to next 15 minutes, NOT be pushed past 11:00.
      const firstEvent = result.taskEvents[0]!.events[0]!;
      // The event should start within the working hours, and importantly should
      // NOT be pushed to after 11:00 just because a completed event was there
      const eventStartHour = firstEvent.start_time.getHours();
      expect(eventStartHour).toBeLessThanOrEqual(11);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should schedule tasks into slots freed by completed tasks', () => {
    // Freeze time to a deterministic morning timestamp to avoid flakiness
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T09:30:00.000Z'));

    try {
      // Completed task had a 2-hour block from 10:00-12:00
      const completedEvent = makeTaskEvent({
        id: 'completed-event-2',
        title: 'Done Task',
        start_time: new Date('2026-03-16T10:00:00.000Z'),
        end_time: new Date('2026-03-16T12:00:00.000Z'),
        linked_task_id: 'done-task',
        completed_at: new Date('2026-03-16T11:00:00.000Z'),
      });

      // A real external calendar event blocks 12:00-13:00
      const externalEvent: CalendarEventUnion = {
        id: 'meeting-1',
        title: 'Lunch Meeting',
        start_time: new Date('2026-03-16T12:00:00.000Z'),
        end_time: new Date('2026-03-16T13:00:00.000Z'),
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const taskToSchedule = makeTask({
        id: 'new-task',
        title: 'New Task',
        planned_duration_minutes: 60,
      });

      const schedule = makeSchedule();

      const result = calculateAutoSchedule({
        tasks: [taskToSchedule],
        existingEvents: [],
        allCalendarEvents: [
          completedEvent as CalendarEventUnion,
          externalEvent,
        ],
        activeSchedule: schedule,
        eventDuration: 60,
        schedules: [schedule],
      });

      expect(result.taskEvents.length).toBe(1);
      const events = result.taskEvents[0]!.events;
      expect(events.length).toBeGreaterThan(0);

      // The new task should NOT be pushed past the external meeting (13:00)
      // because the completed event's 10:00-12:00 slot is now free
      const firstEvent = events[0]!;
      const startHour = firstEvent.start_time.getHours();
      // Should start before or at 12 (in the freed completed slot), not after 13
      expect(startHour).toBeLessThan(13);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should allow scheduling into slots freed by completed recurring task occurrences', () => {
    // Freeze time to a deterministic morning timestamp to avoid flakiness
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T09:30:00.000Z'));

    try {
      // A recurring task (is_recurring: true)
      const recurringTask = makeTask({
        id: 'recurring-task-1',
        title: 'Recurring Task',
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
        planned_duration_minutes: 60,
      });

      // A completed occurrence of the recurring task (10:00-11:00)
      // linked_task_id matches the recurring task id
      const completedRecurringOccurrence = makeTaskEvent({
        id: 'completed-recurring-occurrence',
        title: 'Recurring Task - Completed',
        start_time: new Date('2026-03-16T10:00:00.000Z'),
        end_time: new Date('2026-03-16T11:00:00.000Z'),
        linked_task_id: 'recurring-task-1',
        completed_at: new Date('2026-03-16T10:30:00.000Z'),
      });

      // A non-recurring task to schedule (60 min)
      const taskToSchedule = makeTask({
        id: 'task-to-schedule',
        title: 'Task To Schedule',
        planned_duration_minutes: 60,
      });

      const schedule = makeSchedule();

      // Call calculateAutoSchedule with the completed occurrence included
      // in allCalendarEvents
      const result = calculateAutoSchedule({
        tasks: [taskToSchedule],
        existingEvents: [],
        allCalendarEvents: [completedRecurringOccurrence as CalendarEventUnion],
        activeSchedule: schedule,
        eventDuration: 60,
        schedules: [schedule],
      });

      // The task should be scheduled
      expect(result.taskEvents.length).toBe(1);
      const taskEvents = result.taskEvents[0]!.events;
      expect(taskEvents.length).toBeGreaterThan(0);

      // Assert the non-recurring task can be placed in the freed slot
      // (i.e., its taskEvents contains an event starting in the completed
      // occurrence window 10:00-11:00)
      const firstEvent = taskEvents[0]!;
      const eventStartHour = firstEvent.start_time.getHours();
      // Should be able to use the freed slot (10:00), not pushed past it
      expect(eventStartHour).toBeLessThanOrEqual(10);
    } finally {
      jest.useRealTimers();
    }
  });
});
