import { ProjectService } from '../projectService.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../../types/database.js';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

jest.mock('../../config/supabase.js', () => ({
  supabase: mockSupabase,
}));

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    projectService = new ProjectService();
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create project with string deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31T00:00:00.000Z',
        status: 'not-started',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockProject,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsert),
      });

      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31T00:00:00.000Z', // String deadline
      };

      const result = await projectService.createProject(input);

      expect(result).toEqual(mockProject);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockInsert.insert).toHaveBeenCalledWith([
        {
          name: 'Test Project',
          description: 'Test Description',
          deadline: '2025-12-31T00:00:00.000Z', // Should pass string as-is
          status: 'not-started',
        },
      ]);
    });

    it('should create project with Date deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        deadline: '2025-12-31T00:00:00.000Z',
        status: 'not-started',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockProject,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsert),
      });

      const deadlineDate = new Date('2025-12-31T00:00:00.000Z');
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: deadlineDate, // Date object
      };

      const result = await projectService.createProject(input);

      expect(result).toEqual(mockProject);
      expect(mockInsert.insert).toHaveBeenCalledWith([
        {
          name: 'Test Project',
          description: 'Test Description',
          deadline: '2025-12-31T00:00:00.000Z', // Should convert Date to ISO string
          status: 'not-started',
        },
      ]);
    });

    it('should create project with null deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        deadline: null,
        status: 'not-started',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockProject,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsert),
      });

      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: null,
      };

      const result = await projectService.createProject(input);

      expect(result).toEqual(mockProject);
      expect(mockInsert.insert).toHaveBeenCalledWith([
        {
          name: 'Test Project',
          description: 'Test Description',
          deadline: null,
          status: 'not-started',
        },
      ]);
    });

    it('should create project without deadline field', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        deadline: null,
        status: 'not-started',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockProject,
            error: null,
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsert),
      });

      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'Test Description',
        // No deadline field
      };

      const result = await projectService.createProject(input);

      expect(result).toEqual(mockProject);
      expect(mockInsert.insert).toHaveBeenCalledWith([
        {
          name: 'Test Project',
          description: 'Test Description',
          deadline: null,
          status: 'not-started',
        },
      ]);
    });

    it('should handle database errors', async () => {
      const mockInsert = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' },
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => mockInsert),
      });

      const input: CreateProjectInput = {
        name: 'Test Project',
        deadline: '2025-12-31T00:00:00.000Z',
      };

      await expect(projectService.createProject(input)).rejects.toThrow(
        'Failed to create project: Database error'
      );
    });
  });

  describe('updateProject', () => {
    it('should update project with string deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Updated Project',
        description: 'Updated Description',
        deadline: '2025-12-31T00:00:00.000Z',
        status: 'in-progress',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockProject,
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => mockUpdate),
      });

      const input: UpdateProjectInput = {
        name: 'Updated Project',
        description: 'Updated Description',
        deadline: '2025-12-31T00:00:00.000Z', // String deadline
        status: 'in-progress',
      };

      const result = await projectService.updateProject('1', input);

      expect(result).toEqual(mockProject);
      expect(mockUpdate.update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        name: 'Updated Project',
        description: 'Updated Description',
        deadline: '2025-12-31T00:00:00.000Z', // Should pass string as-is
        status: 'in-progress',
      });
    });

    it('should update project with Date deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Updated Project',
        deadline: '2025-12-31T00:00:00.000Z',
        status: 'in-progress',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockProject,
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => mockUpdate),
      });

      const deadlineDate = new Date('2025-12-31T00:00:00.000Z');
      const input: UpdateProjectInput = {
        name: 'Updated Project',
        deadline: deadlineDate, // Date object
        status: 'in-progress',
      };

      const result = await projectService.updateProject('1', input);

      expect(result).toEqual(mockProject);
      expect(mockUpdate.update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        name: 'Updated Project',
        deadline: '2025-12-31T00:00:00.000Z', // Should convert Date to ISO string
        status: 'in-progress',
      });
    });

    it('should update project with null deadline', async () => {
      const mockProject = {
        id: '1',
        name: 'Updated Project',
        deadline: null,
        status: 'in-progress',
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockProject,
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => mockUpdate),
      });

      const input: UpdateProjectInput = {
        name: 'Updated Project',
        deadline: null,
        status: 'in-progress',
      };

      const result = await projectService.updateProject('1', input);

      expect(result).toEqual(mockProject);
      expect(mockUpdate.update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        name: 'Updated Project',
        deadline: null,
        status: 'in-progress',
      });
    });

    it('should handle database errors during update', async () => {
      const mockUpdate = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Update failed' },
            })),
          })),
        })),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => mockUpdate),
      });

      const input: UpdateProjectInput = {
        name: 'Updated Project',
        deadline: '2025-12-31T00:00:00.000Z',
      };

      await expect(projectService.updateProject('1', input)).rejects.toThrow(
        'Failed to update project: Update failed'
      );
    });
  });

  describe('getAllProjects', () => {
    it('should fetch all projects successfully', async () => {
      const mockProjects = [
        {
          id: '1',
          name: 'Project 1',
          deadline: '2025-12-31T00:00:00.000Z',
          status: 'not-started',
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Project 2',
          deadline: null,
          status: 'in-progress',
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSelect = {
        order: jest.fn(() => ({
          data: mockProjects,
          error: null,
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect),
      });

      const result = await projectService.getAllProjects();

      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should return empty array when no projects found', async () => {
      const mockSelect = {
        order: jest.fn(() => ({
          data: null,
          error: null,
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect),
      });

      const result = await projectService.getAllProjects();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockSelect = {
        order: jest.fn(() => ({
          data: null,
          error: { message: 'Database error' },
        })),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect),
      });

      await expect(projectService.getAllProjects()).rejects.toThrow(
        'Failed to fetch projects: Database error'
      );
    });
  });
});
