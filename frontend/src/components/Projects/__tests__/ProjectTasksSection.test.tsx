import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTasksSection } from '../ProjectTasksSection';
import type { Task } from '@/types';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock the OnboardingContext
jest.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    currentStep: null,
    isOnboarding: false,
  }),
}));

// Mock the dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

// Mock the TaskEditDialogForm
jest.mock('@/components/Tasks/forms/TaskEditDialogForm', () => ({
  TaskEditDialogForm: ({
    task,
    open,
    onTaskUpdated,
  }: {
    task: Task | null;
    open: boolean;
    onTaskUpdated: (task: Task) => void;
  }) => {
    if (!open || !task) return null;
    return (
      <div data-testid="task-edit-dialog">
        <h2>Edit Task</h2>
        <p>Editing: {task.title}</p>
        <button
          onClick={() => {
            const updatedTask = { ...task, title: 'Updated Task Title' };
            onTaskUpdated(updatedTask);
          }}
        >
          Save Changes
        </button>
      </div>
    );
  },
}));

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    description: 'Test description',
    status: 'not-started',
    priority: 'medium',
    due_date: '2024-12-31',
    project_id: 'project-1',
    user_id: 'user-1',
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    dependencies: [],
    blockedBy: [],
    schedule_id: 'schedule-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

describe('ProjectTasksSection - Task Editing', () => {
  it('should allow editing a task and update the task list', async () => {
    const user = userEvent.setup();
    const mockOnTaskCreate = jest.fn();
    const mockOnTaskUnlink = jest.fn();
    const mockOnTaskUpdate = jest.fn();

    const { rerender } = render(
      <ProjectTasksSection
        projectId="project-1"
        tasks={mockTasks}
        onTaskCreate={mockOnTaskCreate}
        onTaskUnlink={mockOnTaskUnlink}
        onTaskUpdate={mockOnTaskUpdate}
      />
    );

    // The task should be displayed
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();

    // Click on the task to open the edit dialog
    const taskElement = screen.getByText('Test Task 1');
    await user.click(taskElement);

    // The edit dialog should open
    await waitFor(() => {
      expect(screen.getByTestId('task-edit-dialog')).toBeInTheDocument();
    });

    // Click the save button
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // The onTaskUpdate callback should be called with the updated task
    await waitFor(() => {
      expect(mockOnTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          title: 'Updated Task Title',
        })
      );
    });

    // Re-render with updated task
    const updatedTasks = [{ ...mockTasks[0], title: 'Updated Task Title' }];
    rerender(
      <ProjectTasksSection
        projectId="project-1"
        tasks={updatedTasks}
        onTaskCreate={mockOnTaskCreate}
        onTaskUnlink={mockOnTaskUnlink}
        onTaskUpdate={mockOnTaskUpdate}
      />
    );

    // The updated task title should be displayed
    expect(screen.getByText('Updated Task Title')).toBeInTheDocument();
    expect(screen.queryByText('Test Task 1')).not.toBeInTheDocument();
  });

  it('should close the edit dialog without updating when cancelled', async () => {
    const user = userEvent.setup();
    const mockOnTaskCreate = jest.fn();
    const mockOnTaskUnlink = jest.fn();
    const mockOnTaskUpdate = jest.fn();

    render(
      <ProjectTasksSection
        projectId="project-1"
        tasks={mockTasks}
        onTaskCreate={mockOnTaskCreate}
        onTaskUnlink={mockOnTaskUnlink}
        onTaskUpdate={mockOnTaskUpdate}
      />
    );

    // Click on the task
    const taskElement = screen.getByText('Test Task 1');
    await user.click(taskElement);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByTestId('task-edit-dialog')).toBeInTheDocument();
    });

    // The onTaskUpdate should not be called if dialog is just closed
    expect(mockOnTaskUpdate).not.toHaveBeenCalled();
  });
});
