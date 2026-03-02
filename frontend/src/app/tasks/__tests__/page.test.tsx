import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPage from '../page';
import type { Task } from '@/types';

// Mock ProtectedRoute to just render children
jest.mock('@/components/Auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock TaskCreateForm
jest.mock('@/components/Tasks/TaskCreateForm', () => ({
  TaskCreateForm: ({
    onTaskCreate,
    isLoading,
  }: {
    onTaskCreate: (data: unknown) => Promise<void>;
    isLoading: boolean;
  }) => (
    <button
      data-testid="create-task-btn"
      disabled={isLoading}
      onClick={() =>
        onTaskCreate({
          title: 'New Task',
          description: '',
          due_date: null,
          priority: 'medium',
          project_id: null,
          planned_duration_minutes: 60,
          actual_duration_minutes: 0,
        })
      }
    >
      {isLoading ? 'Creating...' : 'New Task'}
    </button>
  ),
}));

// Mock TaskList
jest.mock('@/components/Tasks/TaskList', () => ({
  TaskList: ({
    refreshTrigger,
  }: {
    refreshTrigger: number;
    onTaskUpdate: () => void;
  }) => (
    <div data-testid="task-list" data-refresh={refreshTrigger}>
      Task List
    </div>
  ),
}));

jest.mock('@/services/taskService', () => ({
  taskService: {
    createTask: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}));

const { taskService } = require('@/services/taskService');
const { toast } = require('sonner');

const mockTask: Task = {
  id: 'task-1',
  title: 'New Task',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  user_id: 'user-1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
};

describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taskService.createTask.mockResolvedValue(mockTask);
  });

  it('renders page heading', () => {
    render(<TasksPage />);
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
  });

  it('renders the task list', () => {
    render(<TasksPage />);
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });

  it('renders the create task button', () => {
    render(<TasksPage />);
    expect(screen.getByTestId('create-task-btn')).toBeInTheDocument();
  });

  it('increments refreshTrigger after successful task creation', async () => {
    render(<TasksPage />);

    const listBefore = screen.getByTestId('task-list');
    const refreshBefore = Number(listBefore.getAttribute('data-refresh'));

    fireEvent.click(screen.getByTestId('create-task-btn'));

    await waitFor(() => {
      const listAfter = screen.getByTestId('task-list');
      const refreshAfter = Number(listAfter.getAttribute('data-refresh'));
      expect(refreshAfter).toBe(refreshBefore + 1);
    });
  });

  it('calls taskService.createTask with task data', async () => {
    render(<TasksPage />);

    fireEvent.click(screen.getByTestId('create-task-btn'));

    await waitFor(() => {
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Task' })
      );
    });
  });

  it('shows error toast when task creation fails', async () => {
    taskService.createTask.mockRejectedValueOnce(new Error('Server error'));
    render(<TasksPage />);

    fireEvent.click(screen.getByTestId('create-task-btn'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });
  });

  it('disables create button while task is being created', async () => {
    let resolveCreate: () => void = () => {};
    taskService.createTask.mockReturnValueOnce(
      new Promise<Task>(resolve => {
        resolveCreate = () => resolve(mockTask);
      })
    );

    render(<TasksPage />);
    const btn = screen.getByTestId('create-task-btn');

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('create-task-btn')).toBeDisabled();
    });

    resolveCreate();

    await waitFor(() => {
      expect(screen.getByTestId('create-task-btn')).not.toBeDisabled();
    });
  });
});
