/**
 * Tests for frontend recurrence utilities
 */

import {
  calculateNextOccurrence,
  generateOccurrenceDates,
  get90DayHorizon,
  generateSyntheticRecurringEvents,
  expandRecurringTasks,
} from '@/utils/recurrenceCalculator';
import type { Task, CalendarEventTask } from '@/types';

describe('Frontend recurrenceCalculator Utils', () => {
  describe('calculateNextOccurrence', () => {
    it('should calculate next daily occurrence', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      const result = calculateNextOccurrence(date, 'daily', 1);
      expect(result.getDate()).toBe(16);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getFullYear()).toBe(2026);
    });

    it('should calculate next weekly occurrence', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      const result = calculateNextOccurrence(date, 'weekly', 1);
      expect(result.getDate()).toBe(22);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getFullYear()).toBe(2026);
    });

    it('should calculate next monthly occurrence', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      const result = calculateNextOccurrence(date, 'monthly', 1);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it('should handle intervals > 1', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      const result = calculateNextOccurrence(date, 'daily', 3);
      expect(result.getDate()).toBe(18);
      expect(result.getMonth()).toBe(2); // March
    });

    it('should handle month-end overflow for monthly pattern', () => {
      const date = new Date(2026, 0, 31); // Jan 31st, 2026
      const result = calculateNextOccurrence(date, 'monthly', 1);
      // Feb only has 28 days in 2026, should become Feb 28
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28);
      expect(result > date).toBe(true);
    });
  });

  describe('generateOccurrenceDates', () => {
    it('should generate multiple occurrences within horizon', () => {
      const start = new Date(2026, 2, 15); // March 15, 2026
      const horizon = new Date(2026, 2, 31); // March 31, 2026
      const result = generateOccurrenceDates(start, 'daily', 1, horizon);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(2); // March
      expect(result[result.length - 1].getDate()).toBe(31);
      expect(result[result.length - 1].getMonth()).toBe(2); // March
    });

    it('should respect interval spacing', () => {
      const start = new Date(2026, 2, 1); // March 1, 2026
      const horizon = new Date(2026, 2, 15); // March 15, 2026
      const result = generateOccurrenceDates(start, 'daily', 2, horizon);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].getDate()).toBe(1);
      if (result[1]) expect(result[1].getDate()).toBe(3);
      if (result[2]) expect(result[2].getDate()).toBe(5);
    });

    it('should include start date occurrence when matching', () => {
      const start = new Date(2026, 2, 15); // March 15, 2026
      const horizon = new Date(2026, 2, 31); // March 31, 2026
      const result = generateOccurrenceDates(start, 'daily', 1, horizon);

      const includesStartDate = result.some(
        d => d.getDate() === 15 && d.getMonth() === 2
      );
      expect(includesStartDate).toBe(true);
    });

    it('should not include occurrences after horizon', () => {
      const start = new Date(2026, 2, 1); // March 1, 2026
      const horizon = new Date(2026, 2, 15); // March 15, 2026
      const result = generateOccurrenceDates(start, 'daily', 1, horizon);

      const hasLaterDate = result.some(d => d > horizon);
      expect(hasLaterDate).toBe(false);
    });
  });

  describe('get90DayHorizon', () => {
    it('should return date 90 days from now', () => {
      // Use fake timers to avoid non-determinism
      const now = new Date('2026-03-15T12:00:00Z');
      jest.useFakeTimers('modern');
      jest.setSystemTime(now);

      try {
        const horizon = get90DayHorizon();
        const expected = new Date(now);
        expected.setDate(expected.getDate() + 90);

        // Compare dates, ignoring time
        expect(horizon.getFullYear()).toBe(expected.getFullYear());
        expect(horizon.getMonth()).toBe(expected.getMonth());
        expect(horizon.getDate()).toBe(expected.getDate());
      } finally {
        jest.useRealTimers();
      }
    });

    it('should set time to end of day', () => {
      const now = new Date('2026-03-15T12:00:00Z');
      jest.useFakeTimers('modern');
      jest.setSystemTime(now);

      try {
        const horizon = get90DayHorizon();
        expect(horizon.getHours()).toBe(23);
        expect(horizon.getMinutes()).toBe(59);
        expect(horizon.getSeconds()).toBe(59);
        expect(horizon.getMilliseconds()).toBe(999);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('generateSyntheticRecurringEvents', () => {
    const mockTask: Task = {
      id: 'task-1',
      user_id: 'user-1',
      title: 'Daily standup',
      description: 'Team standup meeting',
      priority: 'high',
      status: 'not-started',
      planned_duration_minutes: 30,
      due_date: new Date('2026-03-15'),
      is_recurring: true,
      recurrence_pattern: 'daily',
      recurrence_interval: 1,
      next_generation_cutoff: new Date('2026-03-15'),
      dependencies: [],
      blocked_by: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should generate synthetic events for recurring task', () => {
      const result = generateSyntheticRecurringEvents(mockTask, []);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(event => {
        expect(event.linked_task_id).toBe('task-1');
        expect(event.title).toBe('Daily standup');
      });
    });

    it('should not generate events for non-recurring task', () => {
      const nonRecurringTask: Task = {
        ...mockTask,
        is_recurring: false,
        recurrence_pattern: undefined,
      };

      const result = generateSyntheticRecurringEvents(nonRecurringTask, []);
      expect(result).toHaveLength(0);
    });

    it('should avoid duplicate events on same date', () => {
      const existingDate = new Date('2026-03-15');
      const existingEvent: CalendarEventTask = {
        id: 'event-1',
        linked_task_id: 'task-1',
        title: 'Daily standup',
        description: '',
        start_time: existingDate,
        end_time: existingDate,
        user_id: 'user-1',
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = generateSyntheticRecurringEvents(mockTask, [
        existingEvent,
      ]);

      const hasDuplicate = result.some(
        e => e.start_time.toDateString() === existingDate.toDateString()
      );
      expect(hasDuplicate).toBe(false);
    });

    it('should use next_generation_cutoff as start date', () => {
      const taskWithCutoff: Task = {
        ...mockTask,
        next_generation_cutoff: new Date('2026-03-18'),
      };

      const result = generateSyntheticRecurringEvents(taskWithCutoff, []);

      const firstEventDate = result[0]?.start_time;
      expect(firstEventDate).toBeDefined();
      expect(firstEventDate?.getDate()).toBeGreaterThanOrEqual(18);
    });

    it('should fallback to due_date if next_generation_cutoff is not set', () => {
      const taskNoCutoff: Task = {
        ...mockTask,
        next_generation_cutoff: undefined,
        due_date: new Date('2026-03-15'),
      };

      const result = generateSyntheticRecurringEvents(taskNoCutoff, []);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].start_time.getDate()).toBeGreaterThanOrEqual(15);
    });
  });

  describe('expandRecurringTasks', () => {
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        user_id: 'user-1',
        title: 'Daily task',
        description: '',
        priority: 'medium',
        status: 'not-started',
        planned_duration_minutes: 30,
        due_date: new Date('2026-03-15'),
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
        next_generation_cutoff: new Date('2026-03-15'),
        dependencies: [],
        blocked_by: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'task-2',
        user_id: 'user-1',
        title: 'One-time task',
        description: '',
        priority: 'low',
        status: 'not-started',
        planned_duration_minutes: 60,
        due_date: new Date('2026-03-20'),
        is_recurring: false,
        dependencies: [],
        blocked_by: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    it('should expand only recurring tasks', () => {
      const result = expandRecurringTasks(mockTasks, []);

      const recurring = result.filter(e => e.linked_task_id === 'task-1');
      const nonRecurring = result.filter(e => e.linked_task_id === 'task-2');

      expect(recurring.length).toBeGreaterThan(0);
      expect(nonRecurring.length).toBe(0);
    });

    it('should return empty array if no recurring tasks', () => {
      const nonRecurringTasks = mockTasks.filter(t => !t.is_recurring);
      const result = expandRecurringTasks(nonRecurringTasks, []);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple recurring tasks', () => {
      const multipleTasks: Task[] = [
        ...mockTasks.slice(0, 1),
        {
          id: 'task-3',
          user_id: 'user-1',
          title: 'Weekly task',
          description: '',
          priority: 'high',
          status: 'not-started',
          planned_duration_minutes: 45,
          due_date: new Date('2026-03-15'),
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_interval: 1,
          next_generation_cutoff: new Date('2026-03-15'),
          dependencies: [],
          blocked_by: [],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = expandRecurringTasks(multipleTasks, []);

      const task1Events = result.filter(e => e.linked_task_id === 'task-1');
      const task3Events = result.filter(e => e.linked_task_id === 'task-3');

      expect(task1Events.length).toBeGreaterThan(0);
      expect(task3Events.length).toBeGreaterThan(0);
    });

    it('should respect existing events and avoid duplicates', () => {
      const existingEvent: CalendarEventTask = {
        id: 'event-1',
        linked_task_id: 'task-1',
        title: 'Daily task',
        description: '',
        start_time: new Date('2026-03-15'),
        end_time: new Date('2026-03-15'),
        user_id: 'user-1',
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = expandRecurringTasks(mockTasks, [existingEvent]);

      const duplicates = result.filter(
        e =>
          e.linked_task_id === 'task-1' &&
          e.start_time.toDateString() === 'Sun Mar 15 2026'
      );
      expect(duplicates).toHaveLength(0);
    });
  });
});
