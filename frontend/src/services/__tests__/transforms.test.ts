import { isCalendarEventTask } from '@/types';
import {
  toDate,
  toOptionalDate,
  toTask,
  toTasks,
  toCalendarEventUnion,
  toCalendarEventUnions,
} from '../transforms';

describe('transforms', () => {
  describe('toDate', () => {
    it('should convert string to Date', () => {
      const dateStr = '2025-01-27T10:00:00Z';
      const result = toDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2025-01-27T10:00:00.000Z');
    });

    it('should convert number to Date', () => {
      const timestamp = 1737972000000;
      const result = toDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should return the same Date object if input is a Date', () => {
      const date = new Date();
      const result = toDate(date);
      expect(result).toBe(date);
    });
  });

  describe('toOptionalDate', () => {
    it('should return null for null, undefined, or empty string', () => {
      expect(toOptionalDate(null)).toBeNull();
      expect(toOptionalDate(undefined)).toBeNull();
      expect(toOptionalDate('')).toBeNull();
    });

    it('should return a Date for valid input', () => {
      const dateStr = '2025-01-27T10:00:00Z';
      const result = toOptionalDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-01-27T10:00:00.000Z');
    });
  });

  describe('toTask', () => {
    it('should transform raw record to Task', () => {
      const raw = {
        id: '1',
        title: 'Test Task',
        due_date: '2025-01-27T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blocked_by: ['task-2'],
      };

      const task = toTask(raw);

      expect(task.id).toBe('1');
      expect(task.due_date).toBeInstanceOf(Date);
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);
      expect(task.blockedBy).toEqual(['task-2']);
    });

    it('should handle missing blocked_by', () => {
      const raw = {
        id: '1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };
      const task = toTask(raw);
      expect(task.blockedBy).toEqual([]);
    });
  });

  describe('toTasks', () => {
    it('should transform array of raw records', () => {
      const raw = [
        {
          id: '1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];
      const tasks = toTasks(raw);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('1');
      expect(tasks[1].id).toBe('2');
    });
  });

  describe('toCalendarEventUnion', () => {
    it('should transform raw record to CalendarEventTask if it has linked_task_id', () => {
      const raw = {
        id: 'e1',
        start_time: '2025-01-27T10:00:00Z',
        end_time: '2025-01-27T11:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        linked_task_id: 't1',
        completed_at: '2025-01-27T11:30:00Z',
      };

      const event = toCalendarEventUnion(raw);

      expect(event.start_time).toBeInstanceOf(Date);
      expect(event.end_time).toBeInstanceOf(Date);
      // It should have completed_at because it's a Task event
      if (isCalendarEventTask(event)) {
        expect(event.completed_at).toBeInstanceOf(Date);
      } else {
        throw new Error('event should be a CalendarEventTask');
      }
    });

    it('should transform raw record to base CalendarEvent if it has no linked_task_id', () => {
      const raw = {
        id: 'e1',
        start_time: '2025-01-27T10:00:00Z',
        end_time: '2025-01-27T11:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const event = toCalendarEventUnion(raw);

      expect(event.start_time).toBeInstanceOf(Date);
      expect('linked_task_id' in event).toBe(false);
      expect(isCalendarEventTask(event)).toBe(false);
    });
  });

  describe('toCalendarEventUnions', () => {
    it('should transform array of records', () => {
      const raw = [
        {
          id: 'e1',
          start_time: '2025-01-27T10:00:00Z',
          end_time: '2025-01-27T11:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];
      const events = toCalendarEventUnions(raw);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e1');
    });
  });
});
