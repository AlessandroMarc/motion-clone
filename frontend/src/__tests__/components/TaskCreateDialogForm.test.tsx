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

const mockUseTaskForm = require('@/hooks/useTaskForm').useTaskForm;

describe('TaskCreateDialogForm', () => {
  const mockOnTaskCreate = jest.fn();

  const defaultMockForm = {
    register: jest.fn(),
    handleSubmit: jest.fn(fn => fn),
    errors: {},
    priority: 'medium' as const,
    isSubmitting: false,
    onSubmit: jest.fn(),
    handleCancel: jest.fn(),
    setPriority: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTaskForm.mockReturnValue(defaultMockForm);
  });

  it('should render dialog trigger button', () => {
    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    expect(
      screen.getByRole('button', { name: /create task/i })
    ).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add a new task to your list. Fill in the details below to get started.'
      )
    ).toBeInTheDocument();
  });

  it('should render all form fields when dialog is open', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('should render form action buttons', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create task/i })
    ).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    mockUseTaskForm.mockReturnValue({
      ...defaultMockForm,
      onSubmit: mockOnSubmit,
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should handle cancel button click', async () => {
    const user = userEvent.setup();
    const mockHandleCancel = jest.fn();
    mockUseTaskForm.mockReturnValue({
      ...defaultMockForm,
      handleCancel: mockHandleCancel,
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockHandleCancel).toHaveBeenCalled();
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup();
    mockUseTaskForm.mockReturnValue({
      ...defaultMockForm,
      isSubmitting: true,
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  it('should disable cancel button when submitting', async () => {
    const user = userEvent.setup();
    mockUseTaskForm.mockReturnValue({
      ...defaultMockForm,
      isSubmitting: true,
    });

    render(<TaskCreateDialogForm onTaskCreate={mockOnTaskCreate} />);

    const trigger = screen.getByRole('button', { name: /create task/i });
    await user.click(trigger);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
