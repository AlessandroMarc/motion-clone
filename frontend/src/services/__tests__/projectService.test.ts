import { projectService } from '../projectService';
import type { Project } from '@/../../../shared/types';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ProjectService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'A test project',
    deadline: new Date('2024-12-31'),
    status: 'not-started',
    milestones: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockApiResponse = {
    success: true,
    data: [mockProject],
    message: 'Projects retrieved successfully',
    count: 1,
  };

  describe('createProject', () => {
    it('should create project with string deadline successfully', async () => {
      const createResponse = {
        success: true,
        data: mockProject,
        message: 'Project created successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse,
      } as Response);

      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: '2024-12-31T00:00:00.000Z', // String deadline
      };

      const result = await projectService.createProject(projectData);

      expect(result).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Project',
            description: 'A test project',
            deadline: '2024-12-31T00:00:00.000Z', // Should pass string as-is
          }),
        })
      );
    });

    it('should create project with Date deadline successfully', async () => {
      const createResponse = {
        success: true,
        data: mockProject,
        message: 'Project created successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse,
      } as Response);

      const deadlineDate = new Date('2024-12-31T00:00:00.000Z');
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: deadlineDate, // Date object
      };

      const result = await projectService.createProject(projectData);

      expect(result).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Project',
            description: 'A test project',
            deadline: '2024-12-31T00:00:00.000Z', // Should convert Date to ISO string
          }),
        })
      );
    });

    it('should create project with null deadline successfully', async () => {
      const createResponse = {
        success: true,
        data: { ...mockProject, deadline: null },
        message: 'Project created successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse,
      } as Response);

      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: null,
      };

      const result = await projectService.createProject(projectData);

      expect(result.deadline).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Project',
            description: 'A test project',
            deadline: null, // Should pass null as-is
          }),
        })
      );
    });

    it('should handle API errors when creating project', async () => {
      const errorResponse = {
        success: false,
        error: 'Invalid deadline format',
        message: 'Bad request',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: 'invalid-date',
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        'Invalid deadline format'
      );
    });

    it('should handle network errors when creating project', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: '2024-12-31T00:00:00.000Z',
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle HTTP errors when creating project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      } as Response);

      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        deadline: '2024-12-31T00:00:00.000Z',
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        'HTTP error! status: 400'
      );
    });
  });

  describe('updateProject', () => {
    it('should update project with string deadline successfully', async () => {
      const updateResponse = {
        success: true,
        data: { ...mockProject, name: 'Updated Project' },
        message: 'Project updated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updateResponse,
      } as Response);

      const updateData = {
        name: 'Updated Project',
        deadline: '2024-12-31T00:00:00.000Z', // String deadline
      };

      const result = await projectService.updateProject('1', updateData);

      expect(result.name).toBe('Updated Project');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Updated Project',
            deadline: '2024-12-31T00:00:00.000Z', // Should pass string as-is
          }),
        })
      );
    });

    it('should update project with Date deadline successfully', async () => {
      const updateResponse = {
        success: true,
        data: { ...mockProject, deadline: '2024-12-31T00:00:00.000Z' },
        message: 'Project updated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updateResponse,
      } as Response);

      const deadlineDate = new Date('2024-12-31T00:00:00.000Z');
      const updateData = {
        name: 'Updated Project',
        deadline: deadlineDate, // Date object
      };

      const result = await projectService.updateProject('1', updateData);

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Updated Project',
            deadline: '2024-12-31T00:00:00.000Z', // Should convert Date to ISO string
          }),
        })
      );
    });

    it('should update project with null deadline successfully', async () => {
      const updateResponse = {
        success: true,
        data: { ...mockProject, deadline: null },
        message: 'Project updated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updateResponse,
      } as Response);

      const updateData = {
        name: 'Updated Project',
        deadline: null,
      };

      const result = await projectService.updateProject('1', updateData);

      expect(result.deadline).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Updated Project',
            deadline: null, // Should pass null as-is
          }),
        })
      );
    });

    it('should handle API errors when updating project', async () => {
      const errorResponse = {
        success: false,
        error: 'Project not found',
        message: 'Not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      const updateData = {
        name: 'Updated Project',
        deadline: '2024-12-31T00:00:00.000Z',
      };

      await expect(
        projectService.updateProject('1', updateData)
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getAllProjects', () => {
    it('should fetch all projects successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await projectService.getAllProjects();

      expect(result).toEqual([mockProject]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors when fetching projects', async () => {
      const errorResponse = {
        success: false,
        error: 'Database connection failed',
        message: 'Internal server error',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(projectService.getAllProjects()).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle network errors when fetching projects', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(projectService.getAllProjects()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getProjectById', () => {
    it('should fetch project by ID successfully', async () => {
      const singleProjectResponse = {
        success: true,
        data: mockProject,
        message: 'Project retrieved successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => singleProjectResponse,
      } as Response);

      const result = await projectService.getProjectById('1');

      expect(result).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors when fetching project by ID', async () => {
      const errorResponse = {
        success: false,
        error: 'Project not found',
        message: 'Not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(projectService.getProjectById('1')).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const deleteResponse = {
        success: true,
        message: 'Project deleted successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => deleteResponse,
      } as Response);

      await projectService.deleteProject('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors when deleting project', async () => {
      const errorResponse = {
        success: false,
        error: 'Project not found',
        message: 'Not found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(projectService.deleteProject('1')).rejects.toThrow(
        'Project not found'
      );
    });
  });
});
