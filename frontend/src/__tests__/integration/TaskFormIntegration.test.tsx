import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCreateDialogForm } from '@/components/Tasks/forms/TaskCreateDialogForm';

// Mock the useTaskForm hook
jest.mock('@/hooks/useTaskForm', () => ({
  useTaskForm: jest.fn(),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the form utilities
jest.mock('@/utils/formUtils', () => ({
  transformFormDataToTask: jest.fn(data => ({
    title: data.title,
    description: data.description || '',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    priority: data.priority,
  })),
  hasFieldError: jest.fn(() => false),
  getFieldError: jest.fn(() => undefined),
  getPriorityColor: jest.fn(priority => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-red-500',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  }),
}));

const mockUseTaskForm = require('@/hooks/useTaskForm').useTaskForm;

describe('TaskForm Integration', () => {
  const mockOnTaskCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full form submission flow', async () => {
    const user = userEvent.setup();

    // Mock successful form submission
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    const mockHandleSubmit = jest.fn(fn => (e: any) => {
      e?.preventDefault?.();
      return fn({
        title: 'Test Task',
        description: 'Test Description',
        dueDate: '2024-01-01T10:00',
        priority: 'high',
      });
    });

    mockUseTaskForm.mockReturnValue({
      register: jest.fn(name => ({
        name,
        onChange: jest.fn(),
        onBlur: jest.fn(),
      })),
      handleSubmit: mockHandleSubmit,
      errors: {},
      priority: 'high',
      isSubmitting: false,
      onSubmit: mockOnSubmit,
      handleCancel: jest.fn(),
      setPriority: jest.fn(),
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    // Open dialog
    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    // Verify dialog is open
    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);

    // Verify form submission was called
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('should handle form validation errors', async () => {
    const user = userEvent.setup();

    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(true);
    getFieldError.mockReturnValue('Title is required');

    mockUseTaskForm.mockReturnValue({
      register: jest.fn(name => ({
        name,
        onChange: jest.fn(),
        onBlur: jest.fn(),
      })),
      handleSubmit: jest.fn(fn => fn),
      errors: { title: { message: 'Title is required' } },
      priority: 'medium',
      isSubmitting: false,
      onSubmit: jest.fn(),
      handleCancel: jest.fn(),
      setPriority: jest.fn(),
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    // Open dialog
    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    // Verify error is displayed
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('should handle loading state during submission', async () => {
    const user = userEvent.setup();

    mockUseTaskForm.mockReturnValue({
      register: jest.fn(name => ({
        name,
        onChange: jest.fn(),
        onBlur: jest.fn(),
      })),
      handleSubmit: jest.fn(fn => fn),
      errors: {},
      priority: 'medium',
      isSubmitting: true,
      onSubmit: jest.fn(),
      handleCancel: jest.fn(),
      setPriority: jest.fn(),
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    // Open dialog
    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    // Verify loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('should handle priority selection', async () => {
    const user = userEvent.setup();
    const mockSetPriority = jest.fn();

    mockUseTaskForm.mockReturnValue({
      register: jest.fn(name => ({
        name,
        onChange: jest.fn(),
        onBlur: jest.fn(),
      })),
      handleSubmit: jest.fn(fn => fn),
      errors: {},
      priority: 'medium',
      isSubmitting: false,
      onSubmit: jest.fn(),
      handleCancel: jest.fn(),
      setPriority: mockSetPriority,
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    // Open dialog
    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    // Click on priority selector
    const priorityTrigger = screen.getByRole('combobox');
    await user.click(priorityTrigger);

    // Select high priority
    const highOption = screen.getByText('High Priority');
    await user.click(highOption);

    // Verify setPriority was called
    expect(mockSetPriority).toHaveBeenCalledWith('high');
  });
});
