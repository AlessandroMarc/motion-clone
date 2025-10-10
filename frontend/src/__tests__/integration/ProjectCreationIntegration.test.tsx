import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectsPage } from '@/app/projects/page';
import { Project } from '@/../../../shared/types';

// Mock the project service
jest.mock('@/services/projectService', () => ({
  projectService: {
    createProject: jest.fn(),
    getAllProjects: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
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

describe('Project Creation Integration', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Existing Project',
      description: 'An existing project',
      deadline: new Date('2024-12-31'),
      status: 'not-started',
      milestones: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getAllProjects.mockResolvedValue(mockProjects);
  });

  it('should create project with deadline successfully', async () => {
    const newProject: Project = {
      id: '2',
      name: 'New Project',
      description: 'A new project with deadline',
      deadline: new Date('2024-12-31T00:00:00.000Z'),
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProjectService.createProject.mockResolvedValue(newProject);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with deadline
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');
    const deadlineInput = screen.getByLabelText('Deadline');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'A new project with deadline' },
    });
    fireEvent.change(deadlineInput, { target: { value: '2024-12-31' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'A new project with deadline',
        deadline: new Date('2024-12-31T00:00:00.000Z'), // Should convert string to Date
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should create project without deadline successfully', async () => {
    const newProject: Project = {
      id: '2',
      name: 'New Project',
      description: 'A new project without deadline',
      deadline: null,
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProjectService.createProject.mockResolvedValue(newProject);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form without deadline
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'A new project without deadline' },
    });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'A new project without deadline',
        deadline: null, // Should be null when no deadline provided
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should handle API errors during project creation', async () => {
    const error = new Error('API Error: Invalid deadline format');
    mockProjectService.createProject.mockRejectedValue(error);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with invalid data
    const nameInput = screen.getByLabelText('Project Name');
    const deadlineInput = screen.getByLabelText('Deadline');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(deadlineInput, { target: { value: 'invalid-date' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined,
        deadline: new Date('invalid-date'), // Should still convert to Date (invalid)
      });
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to create project. Please try again.'
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should handle network errors during project creation', async () => {
    const networkError = new Error('Network error');
    mockProjectService.createProject.mockRejectedValue(networkError);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalled();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to create project. Please try again.'
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should handle form validation errors', async () => {
    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Try to submit form without required name
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    expect(mockProjectService.createProject).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('should handle different date formats correctly', async () => {
    const newProject: Project = {
      id: '2',
      name: 'New Project',
      description: 'A new project',
      deadline: new Date('2024-02-29T00:00:00.000Z'), // Leap year date
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProjectService.createProject.mockResolvedValue(newProject);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with leap year date
    const nameInput = screen.getByLabelText('Project Name');
    const deadlineInput = screen.getByLabelText('Deadline');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(deadlineInput, { target: { value: '2024-02-29' } }); // Leap year

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined,
        deadline: new Date('2024-02-29T00:00:00.000Z'), // Should handle leap year correctly
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });

  it('should refresh project list after successful creation', async () => {
    const newProject: Project = {
      id: '2',
      name: 'New Project',
      description: 'A new project',
      deadline: null,
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProjectService.createProject.mockResolvedValue(newProject);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalled();
    });

    // Should refresh the project list
    expect(mockProjectService.getAllProjects).toHaveBeenCalledTimes(2); // Once on load, once after creation
  });

  it('should handle empty description correctly', async () => {
    const newProject: Project = {
      id: '2',
      name: 'New Project',
      description: undefined,
      deadline: null,
      status: 'not-started',
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProjectService.createProject.mockResolvedValue(newProject);

    render(<ProjectsPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Existing Project')).toBeInTheDocument();
    });

    // Open create project dialog
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    // Fill form with empty description
    const nameInput = screen.getByLabelText('Project Name');
    const descriptionInput = screen.getByLabelText('Description');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(descriptionInput, { target: { value: '' } }); // Empty description

    // Submit form
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined, // Should convert empty string to undefined
        deadline: null,
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'Project created successfully!'
    );
  });
});
