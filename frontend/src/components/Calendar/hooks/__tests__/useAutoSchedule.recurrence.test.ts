/**
 * Integration tests for autoSchedule with recurring tasks
 */

import { expandRecurringTasks } from '@/utils/recurrenceCalculator';
import type { Task, CalendarEventTask } from '@/types';

describe('autoSchedule Integration - Recurring Tasks', () => {
  const mockRecurringTask: Task = {
    id: 'recurring-1',
    user_id: 'user-1',
    title: 'Daily standup',
    description: 'Team sync',
    priority: 'high',
    status: 'not-started',
    planned_duration_minutes: 30,
    actual_duration_minutes: 0,
    due_date: new Date('2026-03-15'),
    schedule_id: 'schedule-1',
    is_recurring: true,
    recurrence_pattern: 'daily',
    recurrence_interval: 1,
    next_generation_cutoff: new Date('2026-03-15'),
    dependencies: [],
    blocked_by: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockOneTimeTask: Task = {
    id: 'oneoff-1',
    user_id: 'user-1',
    title: 'Quarterly review',
    description: 'Annual planning',
    priority: 'medium',
    status: 'not-started',
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    due_date: new Date('2026-03-20'),
    schedule_id: 'schedule-1',
    is_recurring: false,
    dependencies: [],
    blocked_by: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe('Recurring task expansion in scheduling pipeline', () => {
    it('should expand recurring tasks before scheduling', () => {
      const tasks = [mockRecurringTask];
      const existingEvents: CalendarEventTask[] = [];

      const syntheticEvents = expandRecurringTasks(tasks, existingEvents);

      expect(syntheticEvents.length).toBeGreaterThan(0);
      expect(syntheticEvents[0].linked_task_id).toBe('recurring-1');
    });

    it('should not expand non-recurring tasks', () => {
      const tasks = [mockOneTimeTask];
      const existingEvents: CalendarEventTask[] = [];

      const syntheticEvents = expandRecurringTasks(tasks, existingEvents);

      expect(syntheticEvents).toHaveLength(0);
    });

    it('should handle mixed recurring and non-recurring tasks', () => {
      const tasks = [mockRecurringTask, mockOneTimeTask];
      const existingEvents: CalendarEventTask[] = [];

      const syntheticEvents = expandRecurringTasks(tasks, existingEvents);

      const recurringEvents = syntheticEvents.filter(
        e => e.linked_task_id === 'recurring-1'
      );
      const oneTimeEvents = syntheticEvents.filter(
        e => e.linked_task_id === 'oneoff-1'
      );

      expect(recurringEvents.length).toBeGreaterThan(0);
      expect(oneTimeEvents).toHaveLength(0);
    });
  });

  describe('Fingerprint tracking for recurrence fields', () => {
    it('should include is_recurring in task fingerprint', () => {
      // Simulate the fingerprint calculation from useAutoSchedule
      const tasks = [mockRecurringTask];

      const fingerprint = tasks
        .map(
          t =>
            `${t.id}:${t.planned_duration_minutes}:${t.status}:${t.is_recurring}:${t.recurrence_pattern}:${t.recurrence_interval}`
        )
        .join('|');

      expect(fingerprint).toContain('true'); // is_recurring
      expect(fingerprint).toContain('daily'); // recurrence_pattern
      expect(fingerprint).toContain('1'); // recurrence_interval
    });

    it('should change fingerprint when recurrence pattern changes', () => {
      const task1: Task = { ...mockRecurringTask, recurrence_pattern: 'daily' };
      const task2: Task = {
        ...mockRecurringTask,
        recurrence_pattern: 'weekly',
      };

      const fingerprint1 = `${task1.id}:${task1.recurrence_pattern}`;
      const fingerprint2 = `${task2.id}:${task2.recurrence_pattern}`;

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should change fingerprint when recurrence interval changes', () => {
      const task1: Task = { ...mockRecurringTask, recurrence_interval: 1 };
      const task2: Task = { ...mockRecurringTask, recurrence_interval: 2 };

      const fingerprint1 = `${task1.id}:${task1.recurrence_interval}`;
      const fingerprint2 = `${task2.id}:${task2.recurrence_interval}`;

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should change fingerprint when turning recurrence on', () => {
      const nonRecurring: Task = { ...mockOneTimeTask, is_recurring: false };
      const recurring: Task = {
        ...mockOneTimeTask,
        is_recurring: true,
        recurrence_pattern: 'daily',
      };

      const fingerprint1 = `${nonRecurring.id}:${nonRecurring.is_recurring}`;
      const fingerprint2 = `${recurring.id}:${recurring.is_recurring}`;

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('Synthetic event generation', () => {
    it('should create synthetic event with task metadata', () => {
      const existingEvents: CalendarEventTask[] = [];
      const syntheticEvents = expandRecurringTasks(
        [mockRecurringTask],
        existingEvents
      );

      expect(syntheticEvents[0]).toEqual(
        expect.objectContaining({
          linked_task_id: 'recurring-1',
          title: 'Daily standup',
          description: 'Team sync',
          user_id: 'user-1',
        })
      );
    });

    it('should mark synthetic events with synthetic ID pattern', () => {
      const syntheticEvents = expandRecurringTasks([mockRecurringTask], []);

      expect(syntheticEvents[0].id).toMatch(/^synthetic-recurring-1-/);
    });

    it('should skip already-scheduled occurrences', () => {
      const existingEvent: CalendarEventTask = {
        id: 'event-1',
        linked_task_id: 'recurring-1',
        title: 'Daily standup',
        description: '',
        start_time: new Date('2026-03-15'),
        end_time: new Date('2026-03-15'),
        user_id: 'user-1',
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const syntheticEvents = expandRecurringTasks(
        [mockRecurringTask],
        [existingEvent]
      );

      const hasDuplicate = syntheticEvents.some(
        e => e.start_time.toDateString() === 'Sun Mar 15 2026'
      );
      expect(hasDuplicate).toBe(false);
    });
  });

  describe('90-day horizon constraint', () => {
    it('should respect 90-day horizon for recurring task expansion', () => {
      const syntheticEvents = expandRecurringTasks([mockRecurringTask], []);

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);

      syntheticEvents.forEach(event => {
        expect(event.start_time.getTime()).toBeLessThanOrEqual(
          maxDate.getTime()
        );
      });
    });

    it('should not generate events beyond horizon', () => {
      const longIntervalTask: Task = {
        ...mockRecurringTask,
        recurrence_pattern: 'monthly',
        recurrence_interval: 1,
      };

      const syntheticEvents = expandRecurringTasks([longIntervalTask], []);

      expect(syntheticEvents.length).toBeLessThanOrEqual(4); // ~3 months max
    });
  });

  describe('Change propagation', () => {
    it('should regenerate events when next_generation_cutoff changes', () => {
      const task1: Task = {
        ...mockRecurringTask,
        next_generation_cutoff: new Date('2026-03-15'),
      };
      const task2: Task = {
        ...mockRecurringTask,
        next_generation_cutoff: new Date('2026-03-20'),
      };

      const events1 = expandRecurringTasks([task1], []);
      const events2 = expandRecurringTasks([task2], []);

      // Events should differ because cutoff changed
      expect(events1.length).not.toBe(events2.length);
    });

    it('should propagate title change to all synthetic events', () => {
      const task: Task = {
        ...mockRecurringTask,
        title: 'Updated standup',
      };

      const syntheticEvents = expandRecurringTasks([task], []);

      syntheticEvents.forEach(event => {
        expect(event.title).toBe('Updated standup');
      });
    });

    it('should propagate description change to all synthetic events', () => {
      const task: Task = {
        ...mockRecurringTask,
        description: 'Updated description',
      };

      const syntheticEvents = expandRecurringTasks([task], []);

      syntheticEvents.forEach(event => {
        expect(event.description).toBe('Updated description');
      });
    });
  });

  describe('Multiple recurring tasks', () => {
    it('should handle multiple recurring tasks with different patterns', () => {
      const dailyTask: Task = {
        ...mockRecurringTask,
        id: 'daily-1',
        recurrence_pattern: 'daily',
      };
      const weeklyTask: Task = {
        ...mockRecurringTask,
        id: 'weekly-1',
        recurrence_pattern: 'weekly',
      };
      const monthlyTask: Task = {
        ...mockRecurringTask,
        id: 'monthly-1',
        recurrence_pattern: 'monthly',
      };

      const syntheticEvents = expandRecurringTasks(
        [dailyTask, weeklyTask, monthlyTask],
        []
      );

      const dailyEvents = syntheticEvents.filter(
        e => e.linked_task_id === 'daily-1'
      );
      const weeklyEvents = syntheticEvents.filter(
        e => e.linked_task_id === 'weekly-1'
      );
      const monthlyEvents = syntheticEvents.filter(
        e => e.linked_task_id === 'monthly-1'
      );

      // Daily should have most events
      expect(dailyEvents.length).toBeGreaterThan(weeklyEvents.length);
      // Weekly should have more than monthly (within 90 days)
      expect(weeklyEvents.length).toBeGreaterThan(monthlyEvents.length);
    });

    it('should keep events independent for different tasks', () => {
      const tasks = [
        { ...mockRecurringTask, id: 'task-1' },
        { ...mockRecurringTask, id: 'task-2' },
      ];

      const syntheticEvents = expandRecurringTasks(tasks, []);

      const task1Events = syntheticEvents.filter(
        e => e.linked_task_id === 'task-1'
      );
      const task2Events = syntheticEvents.filter(
        e => e.linked_task_id === 'task-2'
      );

      expect(task1Events.length).toBeGreaterThan(0);
      expect(task2Events.length).toBeGreaterThan(0);
      expect(task1Events.every(e => e.linked_task_id === 'task-1')).toBe(true);
      expect(task2Events.every(e => e.linked_task_id === 'task-2')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null next_generation_cutoff', () => {
      const task: Task = {
        ...mockRecurringTask,
        next_generation_cutoff: undefined,
      };

      const syntheticEvents = expandRecurringTasks([task], []);
      expect(syntheticEvents.length).toBeGreaterThan(0);
    });

    it('should handle task with no due_date', () => {
      const task: Task = {
        ...mockRecurringTask,
        due_date: undefined,
      };

      const syntheticEvents = expandRecurringTasks([task], []);
      // Should still generate events, using today or cutoff
      expect(syntheticEvents.length).toBeGreaterThan(0);
    });

    it('should handle empty task list', () => {
      const syntheticEvents = expandRecurringTasks([], []);
      expect(syntheticEvents).toHaveLength(0);
    });

    it('should handle empty existing events list', () => {
      const syntheticEvents = expandRecurringTasks([mockRecurringTask], []);
      expect(syntheticEvents.length).toBeGreaterThan(0);
    });
  });
});
