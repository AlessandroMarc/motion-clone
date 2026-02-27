import { renderHook, act } from '@testing-library/react';
import { useProjectForm, projectSchema } from '../useProjectForm';

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
  name: 'My Project',
  description: 'A project description',
  deadline: '',
};

describe('projectSchema', () => {
  it('validates correctly with valid data', () => {
    const result = projectSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = projectSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('rejects name longer than 100 characters', () => {
    const result = projectSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('accepts optional description', () => {
    const result = projectSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('accepts optional deadline', () => {
    const result = projectSchema.safeParse({ name: 'My Project', deadline: '2025-12-31' });
    expect(result.success).toBe(true);
  });
});

describe('useProjectForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected properties', () => {
    const { result } = renderHook(() => useProjectForm(jest.fn()));
    expect(result.current.methods).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.errors).toBeDefined();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.handleCancel).toBeDefined();
  });

  it('sets default values correctly', () => {
    const { result } = renderHook(() => useProjectForm(jest.fn()));
    const values = result.current.methods.getValues();
    expect(values.name).toBe('');
    expect(values.description).toBe('');
    expect(values.deadline).toBe('');
  });

  it('handleCancel resets the form', async () => {
    const { result } = renderHook(() => useProjectForm(jest.fn()));
    await act(async () => {
      result.current.methods.setValue('name', 'Some Project');
    });
    expect(result.current.methods.getValues('name')).toBe('Some Project');
    act(() => {
      result.current.handleCancel();
    });
    expect(result.current.methods.getValues('name')).toBe('');
  });

  it('onSubmit calls onProjectCreate with correct data', async () => {
    const onProjectCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(onProjectCreate).toHaveBeenCalledTimes(1);
    const callArg = onProjectCreate.mock.calls[0][0];
    expect(callArg.name).toBe('My Project');
    expect(callArg.user_id).toBe('user-1');
  });

  it('onSubmit shows toast.success on success', async () => {
    const onProjectCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(toast.success).toHaveBeenCalledWith('Project created successfully!');
  });

  it('onSubmit shows toast.error when onProjectCreate throws', async () => {
    const onProjectCreate = jest.fn().mockRejectedValue(new Error('Create failed'));
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to create project. Please try again.');
  });

  it('resets form after successful submission', async () => {
    const onProjectCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      result.current.methods.setValue('name', 'Test Project');
      await result.current.onSubmit(validData);
    });

    expect(result.current.methods.getValues('name')).toBe('');
  });

  it('passes deadline as null when deadline is empty', async () => {
    const onProjectCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      await result.current.onSubmit({ name: 'My Project', deadline: '' });
    });

    const callArg = onProjectCreate.mock.calls[0][0];
    expect(callArg.deadline).toBeNull();
  });

  it('passes deadline as Date when deadline is set', async () => {
    const onProjectCreate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProjectForm(onProjectCreate));

    await act(async () => {
      await result.current.onSubmit({ name: 'My Project', deadline: '2025-12-31' });
    });

    const callArg = onProjectCreate.mock.calls[0][0];
    expect(callArg.deadline).toBeInstanceOf(Date);
  });
});
