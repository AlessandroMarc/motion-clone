import {
  transformFormDataToTask,
  getPriorityColor,
  getPriorityDisplayText,
  hasFieldError,
  getFieldError,
} from '@/utils/formUtils';

describe('formUtils', () => {
  describe('transformFormDataToTask', () => {
    it('should transform form data correctly', () => {
      const formData = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '2024-01-01T10:00',
        priority: 'high' as const,
      };

      const result = transformFormDataToTask(formData);

      expect(result).toEqual({
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date('2024-01-01T10:00'),
        priority: 'high',
      });
    });

    it('should handle empty description', () => {
      const formData = {
        title: 'Test Task',
        description: '',
        dueDate: '',
        priority: 'medium' as const,
      };

      const result = transformFormDataToTask(formData);

      expect(result).toEqual({
        title: 'Test Task',
        description: '',
        dueDate: null,
        priority: 'medium',
      });
    });

    it('should handle undefined description', () => {
      const formData = {
        title: 'Test Task',
        description: undefined as any,
        dueDate: '',
        priority: 'low' as const,
      };

      const result = transformFormDataToTask(formData);

      expect(result).toEqual({
        title: 'Test Task',
        description: '',
        dueDate: null,
        priority: 'low',
      });
    });

    it('should handle null dueDate', () => {
      const formData = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '',
        priority: 'high' as const,
      };

      const result = transformFormDataToTask(formData);

      expect(result.dueDate).toBeNull();
    });

    it('should convert valid dueDate string to Date', () => {
      const formData = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '2024-12-31T23:59',
        priority: 'medium' as const,
      };

      const result = transformFormDataToTask(formData);

      expect(result.dueDate).toEqual(new Date('2024-12-31T23:59'));
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct color for high priority', () => {
      expect(getPriorityColor('high')).toBe('bg-red-500');
    });

    it('should return correct color for medium priority', () => {
      expect(getPriorityColor('medium')).toBe('bg-yellow-500');
    });

    it('should return correct color for low priority', () => {
      expect(getPriorityColor('low')).toBe('bg-green-500');
    });

    it('should return default color for unknown priority', () => {
      expect(getPriorityColor('unknown')).toBe('bg-gray-500');
    });
  });

  describe('getPriorityDisplayText', () => {
    it('should return correct text for high priority', () => {
      expect(getPriorityDisplayText('high')).toBe('High Priority');
    });

    it('should return correct text for medium priority', () => {
      expect(getPriorityDisplayText('medium')).toBe('Medium Priority');
    });

    it('should return correct text for low priority', () => {
      expect(getPriorityDisplayText('low')).toBe('Low Priority');
    });

    it('should return default text for unknown priority', () => {
      expect(getPriorityDisplayText('unknown')).toBe('Unknown Priority');
    });
  });

  describe('hasFieldError', () => {
    it('should return true when field has error', () => {
      const errors = {
        title: { message: 'Title is required' },
        description: undefined,
      };

      expect(hasFieldError(errors, 'title')).toBe(true);
    });

    it('should return false when field has no error', () => {
      const errors = {
        title: { message: 'Title is required' },
        description: undefined,
      };

      expect(hasFieldError(errors, 'description')).toBe(false);
    });

    it('should return false when errors object is empty', () => {
      const errors = {};

      expect(hasFieldError(errors, 'title')).toBe(false);
    });

    it('should return false when errors is null or undefined', () => {
      expect(hasFieldError(null, 'title')).toBe(false);
      expect(hasFieldError(undefined, 'title')).toBe(false);
    });
  });

  describe('getFieldError', () => {
    it('should return error message when field has error', () => {
      const errors = {
        title: { message: 'Title is required' },
        description: undefined,
      };

      expect(getFieldError(errors, 'title')).toBe('Title is required');
    });

    it('should return undefined when field has no error', () => {
      const errors = {
        title: { message: 'Title is required' },
        description: undefined,
      };

      expect(getFieldError(errors, 'description')).toBeUndefined();
    });

    it('should return undefined when errors object is empty', () => {
      const errors = {};

      expect(getFieldError(errors, 'title')).toBeUndefined();
    });

    it('should return undefined when errors is null or undefined', () => {
      expect(getFieldError(null, 'title')).toBeUndefined();
      expect(getFieldError(undefined, 'title')).toBeUndefined();
    });
  });
});
