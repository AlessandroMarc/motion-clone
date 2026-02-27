import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectList } from '../ProjectList';
import type { Project } from '@/types';

// Mock services
jest.mock('@/services/projectService', () => ({
  projectService: {
    getAllProjects: jest.fn(),
    deleteProject: jest.fn(),
    updateProject: jest.fn(),
  },
}));

jest.mock('@/services/taskService', () => ({
  taskService: {
    getAllTasks: jest.fn(),
  },
}));

jest.mock('@/services/calendarService', () => ({
  calendarService: {
    getAllCalendarEvents: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const { projectService } = require('@/services/projectService');
const { taskService } = require('@/services/taskService');
const { calendarService } = require('@/services/calendarService');

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  deadline: null,
  milestones: [],
  status: 'not-started',
  user_id: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('ProjectList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectService.getAllProjects.mockResolvedValue([mockProject]);
    taskService.getAllTasks.mockResolvedValue([]);
    calendarService.getAllCalendarEvents.mockResolvedValue([]);
    projectService.deleteProject.mockResolvedValue(undefined);
  });

  it('shows a confirmation dialog when the Delete button is clicked', async () => {
    render(<ProjectList />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click the Delete button on the project
    const deleteButton = screen.getByRole('button', {
      name: /delete project/i,
    });
    fireEvent.click(deleteButton);

    // The confirmation dialog should appear
    expect(screen.getByText('Delete project?')).toBeInTheDocument();
    expect(screen.getByText(/all its associated tasks/i)).toBeInTheDocument();
  });

  it('does not call deleteProject when Cancel is clicked in the dialog', async () => {
    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', {
      name: /delete project/i,
    });
    fireEvent.click(deleteButton);

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // deleteProject should NOT have been called
    expect(projectService.deleteProject).not.toHaveBeenCalled();
  });

  it('calls deleteProject when Delete is confirmed in the dialog', async () => {
    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', {
      name: /delete project/i,
    });
    fireEvent.click(deleteButton);

    // Click the confirm Delete button in the dialog
    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    // deleteProject should have been called with the project ID
    await waitFor(() => {
      expect(projectService.deleteProject).toHaveBeenCalledWith('project-1');
    });
  });
});
