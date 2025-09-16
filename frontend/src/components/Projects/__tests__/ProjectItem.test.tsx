import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectItem } from '../ProjectItem';
import type { Project } from '@/../../../shared/types';

const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'A test project description',
  deadline: new Date('2024-12-31'),
  status: 'not-started',
  milestones: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockOnStatusToggle = jest.fn();
const mockOnDelete = jest.fn();

describe('ProjectItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project information correctly', () => {
    render(
      <ProjectItem
        project={mockProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();
    expect(screen.getByText('not started')).toBeInTheDocument();
    expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument();
  });

  it('should render project without description', () => {
    const projectWithoutDescription = {
      ...mockProject,
      description: undefined,
    };

    render(
      <ProjectItem
        project={projectWithoutDescription}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(
      screen.queryByText('A test project description')
    ).not.toBeInTheDocument();
  });

  it('should render project without deadline', () => {
    const projectWithoutDeadline = {
      ...mockProject,
      deadline: null,
    };

    render(
      <ProjectItem
        project={projectWithoutDeadline}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.queryByText('Dec 31, 2024')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    render(
      <ProjectItem
        project={mockProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should show overdue indicator for overdue projects', () => {
    const overdueProject = {
      ...mockProject,
      deadline: new Date('2020-01-01'), // Past date
      status: 'not-started',
    };

    render(
      <ProjectItem
        project={overdueProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    // Should show overdue styling (red text)
    const deadlineElement = screen.getByText('Jan 1, 2020');
    const parentDiv = deadlineElement.closest('div');
    expect(parentDiv).toHaveClass('text-red-500');
  });

  it('should not show overdue indicator for completed projects', () => {
    const overdueCompletedProject = {
      ...mockProject,
      deadline: new Date('2020-01-01'), // Past date
      status: 'completed',
    };

    render(
      <ProjectItem
        project={overdueCompletedProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    // Should not show overdue styling for completed projects
    const deadlineElement = screen.getByText('Jan 1, 2020');
    expect(deadlineElement).not.toHaveClass('text-red-500');
  });

  it('should show completed status with strikethrough', () => {
    const completedProject = {
      ...mockProject,
      status: 'completed' as const,
    };

    render(
      <ProjectItem
        project={completedProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    const titleElement = screen.getByText('Test Project');
    expect(titleElement).toHaveClass('line-through', 'text-muted-foreground');
  });

  it('should display correct status text', () => {
    const inProgressProject = {
      ...mockProject,
      status: 'in-progress' as const,
    };

    render(
      <ProjectItem
        project={inProgressProject}
        onStatusToggle={mockOnStatusToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('should handle different project statuses', () => {
    const statuses: Array<Project['status']> = [
      'not-started',
      'in-progress',
      'completed',
    ];

    statuses.forEach(status => {
      const { unmount } = render(
        <ProjectItem
          project={{ ...mockProject, status }}
          onStatusToggle={mockOnStatusToggle}
          onDelete={mockOnDelete}
        />
      );

      const expectedStatusText = status.replace('-', ' ');
      expect(screen.getByText(expectedStatusText)).toBeInTheDocument();

      unmount();
    });
  });
});
