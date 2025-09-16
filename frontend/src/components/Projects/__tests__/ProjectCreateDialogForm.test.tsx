import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectCreateDialogForm } from '../forms/ProjectCreateDialogForm';
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

describe('ProjectCreateDialogForm', () => {
  const mockOnProjectCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog form correctly', () => {
    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(
      screen.getByText('Add a new project to organize your goals.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Deadline')).toBeInTheDocument();
  });

  it('should create project with valid data including deadline', async () => {
    const mockProject: Project = {
      id: '1',
      name: 'Test Project',
      description: 'Test Description',
      deadline: new Date('2024-12-31T00:00:00.000Z'),
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOnProjectCreate.mockResolvedValue(undefined);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');
    const deadlineInput = screen.getByLabelText('Deadline');

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test Description' },
    });
    fireEvent.change(deadlineInput, { target: { value: '2024-12-31' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        deadline: new Date('2024-12-31T00:00:00.000Z'), // Should convert string to Date
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should create project with valid data without deadline', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form (no deadline)
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test Description' },
    });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        deadline: null, // Should be null when no deadline provided
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should create project with empty description', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with empty description
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descriptionInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalledWith({
        name: 'Test Project',
        description: undefined, // Should convert empty string to undefined
        deadline: null,
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle form validation errors', async () => {
    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Try to submit form without required name
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    expect(mockOnProjectCreate).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('API Error');
    mockOnProjectCreate.mockRejectedValue(error);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'Test Project' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalled();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to create project. Please try again.'
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should handle date input edge cases', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with edge case date
    const nameInput = screen.getByLabelText('Project Name');
    const deadlineInput = screen.getByLabelText('Deadline');

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.change(deadlineInput, { target: { value: '2024-02-29' } }); // Leap year date

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalledWith({
        name: 'Test Project',
        description: undefined,
        deadline: new Date('2024-02-29T00:00:00.000Z'), // Should handle leap year correctly
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should close dialog after successful creation', async () => {
    mockOnProjectCreate.mockResolvedValue(undefined);

    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'Test Project' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnProjectCreate).toHaveBeenCalled();
    });

    // Dialog should be closed after successful creation
    expect(
      screen.queryByText('Add a new project to organize your goals.')
    ).not.toBeInTheDocument();
  });

  it('should show loading state when creating project', () => {
    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={true}
      />
    );

    // Button should be disabled when loading
    const createButton = screen.getByText('Create Project');
    expect(createButton).toBeDisabled();
  });

  it('should handle cancel action', () => {
    render(
      <ProjectCreateDialogForm
        onProjectCreate={mockOnProjectCreate}
        isLoading={false}
      />
    );

    // Open dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'Test Project' } });

    // Cancel form
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Dialog should be closed
    expect(
      screen.queryByText('Add a new project to organize your goals.')
    ).not.toBeInTheDocument();
    expect(mockOnProjectCreate).not.toHaveBeenCalled();
  });
});
