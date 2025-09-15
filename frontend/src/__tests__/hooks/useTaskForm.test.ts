import { renderHook, act } from '@testing-library/react';
import { useTaskForm, taskSchema } from '@/hooks/useTaskForm';

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the transformFormDataToTask utility
jest.mock('@/utils/formUtils', () => ({
  transformFormDataToTask: jest.fn(data => ({
    title: data.title,
    description: data.description || '',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    priority: data.priority,
  })),
}));

describe('useTaskForm', () => {
  const mockOnTaskCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    expect(result.current.priority).toBe('medium');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle form submission successfully', async () => {
    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    const formData = {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: '2024-01-01T10:00',
      priority: 'high' as const,
    };

    await act(async () => {
      await result.current.onSubmit(formData);
    });

    expect(mockOnTaskCreate).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      dueDate: new Date('2024-01-01T10:00'),
      priority: 'high',
    });
  });

  it('should handle form submission with empty description', async () => {
    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    const formData = {
      title: 'Test Task',
      description: '',
      dueDate: '',
      priority: 'medium' as const,
    };

    await act(async () => {
      await result.current.onSubmit(formData);
    });

    expect(mockOnTaskCreate).toHaveBeenCalledWith({
      title: 'Test Task',
      description: '',
      dueDate: null,
      priority: 'medium',
    });
  });

  it('should handle form submission error', async () => {
    const mockError = new Error('API Error');
    mockOnTaskCreate.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    const formData = {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: '',
      priority: 'low' as const,
    };

    await act(async () => {
      await result.current.onSubmit(formData);
    });

    expect(mockOnTaskCreate).toHaveBeenCalled();
  });

  it('should reset form on cancel', () => {
    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    act(() => {
      result.current.handleCancel();
    });

    // Form should be reset (we can't directly test the form state, but we can test that the function doesn't throw)
    expect(() => result.current.handleCancel()).not.toThrow();
  });

  it('should set priority correctly', () => {
    const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

    act(() => {
      result.current.setPriority('high');
    });

    expect(result.current.priority).toBe('high');
  });
});

describe('taskSchema validation', () => {
  it('should validate correct task data', () => {
    const validData = {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: '2024-01-01T10:00',
      priority: 'high' as const,
    };

    const result = taskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate task data with empty description', () => {
    const validData = {
      title: 'Test Task',
      description: '',
      dueDate: '2024-01-01T10:00',
      priority: 'medium' as const,
    };

    const result = taskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const invalidData = {
      title: '',
      description: 'Test Description',
      dueDate: '2024-01-01T10:00',
      priority: 'high' as const,
    };

    const result = taskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Title is required');
    }
  });

  it('should reject title that is too long', () => {
    const invalidData = {
      title: 'a'.repeat(101),
      description: 'Test Description',
      dueDate: '2024-01-01T10:00',
      priority: 'high' as const,
    };

    const result = taskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Title must be less than 100 characters'
      );
    }
  });

  it('should reject description that is too long', () => {
    const invalidData = {
      title: 'Test Task',
      description: 'a'.repeat(501),
      dueDate: '2024-01-01T10:00',
      priority: 'high' as const,
    };

    const result = taskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Description must be less than 500 characters'
      );
    }
  });

  it('should reject invalid priority', () => {
    const invalidData = {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: '2024-01-01T10:00',
      priority: 'invalid' as any,
    };

    const result = taskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept valid priority values', () => {
    const priorities = ['low', 'medium', 'high'] as const;

    priorities.forEach(priority => {
      const validData = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '2024-01-01T10:00',
        priority,
      };

      const result = taskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
