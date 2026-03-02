import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectsPage from '../page';
import type { Project } from '@/types';

// Mock ProtectedRoute to just render children
jest.mock('@/components/Auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock ProjectCreateForm
jest.mock('@/components/Projects/ProjectCreateForm', () => ({
  ProjectCreateForm: ({
    onProjectCreate,
    isLoading,
  }: {
    onProjectCreate: (data: unknown) => Promise<void>;
    isLoading: boolean;
  }) => (
    <button
      data-testid="create-project-btn"
      disabled={isLoading}
      onClick={() => {
        void onProjectCreate({
          name: 'New Project',
          description: '',
          deadline: null,
          user_id: 'user-1',
        }).catch(() => {});
      }}
    >
      {isLoading ? 'Creating...' : 'New Project'}
    </button>
  ),
}));

// Mock ProjectList
jest.mock('@/components/Projects/ProjectList', () => ({
  ProjectList: ({
    refreshTrigger,
  }: {
    refreshTrigger: number;
    onProjectUpdate: () => void;
  }) => (
    <div data-testid="project-list" data-refresh={refreshTrigger}>
      Project List
    </div>
  ),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
}));

jest.mock('@/services/projectService', () => ({
  projectService: {
    createProject: jest.fn(),
  },
}));

const { projectService } = require('@/services/projectService');

const mockProject: Project = {
  id: 'project-1',
  name: 'New Project',
  description: '',
  deadline: null,
  milestones: [],
  status: 'not-started',
  user_id: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectService.createProject.mockResolvedValue(mockProject);
  });

  it('renders page heading', () => {
    render(<ProjectsPage />);
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
  });

  it('renders the project list', () => {
    render(<ProjectsPage />);
    expect(screen.getByTestId('project-list')).toBeInTheDocument();
  });

  it('renders the create project button', () => {
    render(<ProjectsPage />);
    expect(screen.getByTestId('create-project-btn')).toBeInTheDocument();
  });

  it('increments refreshTrigger after successful project creation', async () => {
    render(<ProjectsPage />);

    const listBefore = screen.getByTestId('project-list');
    const refreshBefore = Number(listBefore.getAttribute('data-refresh'));

    fireEvent.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      const listAfter = screen.getByTestId('project-list');
      const refreshAfter = Number(listAfter.getAttribute('data-refresh'));
      expect(refreshAfter).toBe(refreshBefore + 1);
    });
  });

  it('calls projectService.createProject with user_id from auth context', async () => {
    render(<ProjectsPage />);

    fireEvent.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' })
      );
    });
  });

  it('does not call projectService.createProject when user is not authenticated', async () => {
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValueOnce({ user: null });

    render(<ProjectsPage />);
    fireEvent.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(projectService.createProject).not.toHaveBeenCalled();
    });
  });
});
