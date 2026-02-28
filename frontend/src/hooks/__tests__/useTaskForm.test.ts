import { renderHook, act } from '@testing-library/react';
import { useTaskForm, taskSchema } from '../useTaskForm';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: jest.fn().mockReturnValue({ advanceToNextStep: jest.fn() }),
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('posthog-js', () => ({
  default: { capture: jest.fn() },
  capture: jest.fn(),
}));

import { toast } from 'sonner';

const validData = {
  title: 'My Task',
  description: '',
  priority: 'medium' as const,
  scheduleId: 'schedule-1',
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  blockedBy: [],
  project_id: null,
};

describe('taskSchema', () => {
  it('validates correctly with valid data', () => {
    const result = taskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = taskSchema.safeParse({ ...validData, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('rejects title longer than 100 characters', () => {
    const result = taskSchema.safeParse({
      ...validData,
      title: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('rejects actual_duration_minutes greater than planned_duration_minutes', () => {
    const result = taskSchema.safeParse({
      ...validData,
      planned_duration_minutes: 30,
      actual_duration_minutes: 60,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i =>
        i.path.includes('actual_duration_minutes')
      );
      expect(issue).toBeDefined();
    }
  });

  it('accepts actual_duration_minutes equal to planned_duration_minutes', () => {
    const result = taskSchema.safeParse({
      ...validData,
      planned_duration_minutes: 60,
      actual_duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });
});

describe('useTaskForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected properties', () => {
    const { result } = renderHook(() => useTaskForm(jest.fn()));
    expect(result.current.form).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.errors).toBeDefined();
    expect(result.current.priority).toBeDefined();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sets default values correctly', () => {
    const { result } = renderHook(() => useTaskForm(jest.fn()));
    const values = result.current.form.getValues();
    expect(values.priority).toBe('medium');
    expect(values.description).toBe('');
    expect(values.planned_duration_minutes).toBe(60);
    expect(values.actual_duration_minutes).toBe(0);
    expect(values.blockedBy).toEqual([]);
    expect(values.scheduleId).toBe('');
  });

  it('handleCancel resets the form', async () => {
    const { result } = renderHook(() => useTaskForm(jest.fn()));
    await act(async () => {
      result.current.form.setValue('title', 'Some Title');
    });
    expect(result.current.form.getValues('title')).toBe('Some Title');
    act(() => {
      result.current.handleCancel();
    });
    expect(result.current.form.getValues('title')).toBeUndefined();
  });

  it('setPriority updates priority value', async () => {
    const { result } = renderHook(() => useTaskForm(jest.fn()));
    act(() => {
      result.current.setPriority('high');
    });
    expect(result.current.form.getValues('priority')).toBe('high');
  });

  it('onSubmit calls onTaskCreate with correct data', async () => {
    const onTaskCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTaskForm(onTaskCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(onTaskCreate).toHaveBeenCalledTimes(1);
    const callArg = onTaskCreate.mock.calls[0][0];
    expect(callArg.title).toBe('My Task');
    expect(callArg.user_id).toBe('user-1');
  });

  it('onSubmit shows toast.success on success', async () => {
    const onTaskCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTaskForm(onTaskCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(toast.success).toHaveBeenCalledWith('Task created successfully!');
  });

  it('onSubmit shows toast.error when onTaskCreate throws', async () => {
    const onTaskCreate = jest
      .fn()
      .mockRejectedValue(new Error('Create failed'));
    const { result } = renderHook(() => useTaskForm(onTaskCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(toast.error).toHaveBeenCalledWith('Create failed');
  });

  it('priority reflects current form priority value', async () => {
    const { result } = renderHook(() => useTaskForm(jest.fn()));
    expect(result.current.priority).toBe('medium');
    act(() => {
      result.current.setPriority('low');
    });
    expect(result.current.priority).toBe('low');
  });
});
