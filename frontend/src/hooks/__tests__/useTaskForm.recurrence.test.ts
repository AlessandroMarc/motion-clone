/**
 * Tests for form validation schema with recurrence fields
 */

import { taskSchema, type TaskFormData } from '@/hooks/useTaskForm';

describe('taskSchema - Recurrence Validation', () => {
  describe('is_recurring field', () => {
    it('should accept is_recurring as true', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        dueDate: '2026-03-15',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept is_recurring as false', () => {
      const data: TaskFormData = {
        title: 'One-time task',
        description: '',
        dueDate: '2026-03-15',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        // Recurrence fields should be optional when is_recurring is false
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('recurrence_pattern validation', () => {
    it('should require pattern when is_recurring is true', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        // Missing recurrence_pattern
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const patternError = result.error.issues.find(
          i => i.path[0] === 'recurrence_pattern'
        );
        expect(patternError).toBeDefined();
        expect(patternError?.message).toContain('Pattern is required');
      }
    });

    it('should accept daily pattern', () => {
      const data: TaskFormData = {
        title: 'Daily task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept weekly pattern', () => {
      const data: TaskFormData = {
        title: 'Weekly task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'weekly',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept monthly pattern', () => {
      const data: TaskFormData = {
        title: 'Monthly task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'monthly',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid pattern', () => {
      const data = {
        title: 'Invalid pattern task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'yearly', // Invalid
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow undefined pattern when is_recurring is false', () => {
      const data: TaskFormData = {
        title: 'One-time task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        recurrence_pattern: undefined,
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('recurrence_interval validation', () => {
    it('should require interval >= 1 when is_recurring is true', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 0, // Invalid
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const intervalError = result.error.issues.find(
          i => i.path[0] === 'recurrence_interval'
        );
        expect(intervalError).toBeDefined();
      }
    });

    it('should accept positive intervals', () => {
      const intervals = [1, 2, 5, 10, 100];

      for (const interval of intervals) {
        const data: TaskFormData = {
          title: 'Recurring task',
          description: '',
          priority: 'medium',
          project_id: null,
          planned_duration_minutes: 60,
          actual_duration_minutes: 0,
          blockedBy: [],
          is_recurring: true,
          recurrence_pattern: 'daily',
          recurrence_interval: interval,
        };

        const result = taskSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject negative intervals', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: -1, // Invalid
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Conditional validation', () => {
    it('should not require pattern and interval when is_recurring is false', () => {
      const data: TaskFormData = {
        title: 'One-time task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate pattern and interval when is_recurring is true', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        // Pattern missing
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => String(i.path[0]));
        expect(issues).toContain('recurrence_pattern');
      }
    });

    it('should allow recurrence fields to be partial when is_recurring is false', () => {
      const data: TaskFormData = {
        title: 'Task with partial recurrence data',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        recurrence_pattern: undefined, // Should be ignored
        recurrence_interval: 1, // Should be ignored when is_recurring is false
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Integration with other fields', () => {
    it('should validate recurrence with all required fields', () => {
      const data: TaskFormData = {
        title: 'Complete recurring task',
        description: 'Full details',
        dueDate: '2026-03-15',
        priority: 'high',
        project_id: 'proj-1',
        planned_duration_minutes: 120,
        actual_duration_minutes: 0,
        blockedBy: ['task-1', 'task-2'],
        is_recurring: true,
        recurrence_pattern: 'weekly',
        recurrence_interval: 2,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should still enforce other field validations with recurrence', () => {
      const data: TaskFormData = {
        title: 'Recurring task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 120, // Exceeds planned duration
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const durationError = result.error.issues.find(
          i => i.path[0] === 'actual_duration_minutes'
        );
        expect(durationError).toBeDefined();
      }
    });

    it('should validate title requirement with recurrence', () => {
      const data = {
        title: '', // Missing
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(i => i.path[0] === 'title');
        expect(titleError).toBeDefined();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined recurrence fields for non-recurring tasks', () => {
      const data: TaskFormData = {
        title: 'Task',
        description: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        recurrence_pattern: undefined,
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate empty values correctly', () => {
      const data: TaskFormData = {
        title: 'Task',
        description: '',
        dueDate: '',
        priority: 'medium',
        project_id: null,
        planned_duration_minutes: 30,
        actual_duration_minutes: 0,
        blockedBy: [],
        is_recurring: false,
        recurrence_interval: 1,
      };

      const result = taskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
