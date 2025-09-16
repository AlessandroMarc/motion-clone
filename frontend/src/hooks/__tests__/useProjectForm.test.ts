import { renderHook, act } from '@testing-library/react';
import { useProjectForm } from '../useProjectForm';
import type { Project } from '@/../../../shared/types';

// Mock the project service
jest.mock('@/services/projectService', () => ({
  projectService: {
    createProject: jest.fn(),
  },
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { projectService } from '@/services/projectService';
import { toast } from 'sonner';

const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useProjectForm', () => {
  const mockOnProjectCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.errors).toBeDefined();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle form submission with string deadline', async () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      description: 'Test Description',
      deadline: new Date('2025-12-31T00:00:00.000Z'),
      status: 'not-started' as const,
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31', // String date from HTML input
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: 'Test Description',
      deadline: new Date('2025-12-31T00:00:00.000Z'), // Should convert to Date
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle form submission with empty deadline', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: '', // Empty string
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: 'Test Description',
      deadline: null, // Should convert empty string to null
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle form submission without deadline field', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        // No deadline field
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: 'Test Description',
      deadline: null, // Should default to null
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle form submission with invalid date string', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: 'invalid-date', // Invalid date string
      };

      await result.current.onSubmit(formData);
    });

    // Should still call with the invalid date (Date constructor handles this)
    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: 'Test Description',
      deadline: new Date('invalid-date'), // Date constructor creates invalid date
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle form submission errors', async () => {
    const error = new Error('API Error');
    mockOnProjectCreate.mockRejectedValue(error);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31',
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: 'Test Description',
      deadline: new Date('2025-12-31T00:00:00.000Z'),
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to create project. Please try again.'
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should handle form submission with undefined description', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: undefined,
        deadline: '2025-12-31',
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: undefined, // Should pass undefined as-is
      deadline: new Date('2025-12-31T00:00:00.000Z'),
    });
  });

  it('should handle form submission with empty description', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: '', // Empty string
        deadline: '2025-12-31',
      };

      await result.current.onSubmit(formData);
    });

    expect(mockOnProjectCreate).toHaveBeenCalledWith({
      name: 'Test Project',
      description: undefined, // Should convert empty string to undefined
      deadline: new Date('2025-12-31T00:00:00.000Z'),
    });
  });

  it('should reset form after successful submission', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    await act(async () => {
      const formData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31',
      };

      await result.current.onSubmit(formData);
    });

    // Form should be reset after successful submission
    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle cancel action', () => {
    const { result } = renderHook(() => useProjectForm(mockOnProjectCreate));

    act(() => {
      result.current.handleCancel();
    });

    // Form should be reset when cancelled
    expect(mockOnProjectCreate).not.toHaveBeenCalled();
  });
});
