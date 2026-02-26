import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Project } from '../../types/database.js';

// Mock Supabase client – methods chain and return the client or results
interface MockClient {
  from: jest.Mock<any>;
  select: jest.Mock<any>;
  insert: jest.Mock<any>;
  update: jest.Mock<any>;
  delete: jest.Mock<any>;
  eq: jest.Mock<any>;
  single: jest.Mock<any>;
  order: jest.Mock<any>;
  [key: string]: jest.Mock<any>;
}

const mockClient: MockClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
};

// Mock supabase BEFORE importing anything that uses it
jest.unstable_mockModule('../../config/supabase.js', () => ({
  serviceRoleSupabase: mockClient,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
}));

const { ProjectService } = await import('../projectService.js');

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  description: 'description',
  deadline: null,
  status: 'not-started',
  user_id: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  milestones: [],
  ...overrides,
});

describe('ProjectService', () => {
  let service: InstanceType<typeof ProjectService>;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ['from', 'select', 'insert', 'update', 'eq', 'order']) {
      const mock = mockClient[key as keyof MockClient];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new ProjectService();
  });

  // ─── getAllProjects ───────────────────────────────────────────────────────────
  describe('getAllProjects', () => {
    test('should return all projects', async () => {
      const projects = [makeProject({ id: 'p1' }), makeProject({ id: 'p2' })];
      mockClient.order.mockResolvedValue({ data: projects, error: null });

      const result = await service.getAllProjects(mockClient as any);

      expect(mockClient.from).toHaveBeenCalledWith('projects');
      expect(result).toEqual(projects);
    });

    test('should return empty array when no projects', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getAllProjects(mockClient as any);

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getAllProjects(mockClient as any)).rejects.toThrow(
        'Failed to fetch projects: DB error'
      );
    });
  });

  // ─── getProjectById ───────────────────────────────────────────────────────────
  describe('getProjectById', () => {
    test('should return project when found', async () => {
      const project = makeProject();
      mockClient.single.mockResolvedValue({ data: project, error: null });

      const result = await service.getProjectById('proj-1', mockClient as any);

      expect(mockClient.eq).toHaveBeenCalledWith('id', 'proj-1');
      expect(result).toEqual(project);
    });

    test('should return null when project not found (PGRST116)', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getProjectById('missing', mockClient as any);

      expect(result).toBeNull();
    });

    test('should throw on other database errors', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'CONN_ERR', message: 'Connection refused' },
      });

      await expect(
        service.getProjectById('proj-1', mockClient as any)
      ).rejects.toThrow('Failed to fetch project: Connection refused');
    });
  });

  // ─── createProject ────────────────────────────────────────────────────────────
  describe('createProject', () => {
    test('should create a project with not-started status by default', async () => {
      const project = makeProject({ status: 'not-started' });
      mockClient.single.mockResolvedValue({ data: project, error: null });

      const result = await service.createProject(
        { name: 'New Project', user_id: 'user-1' },
        mockClient as any
      );

      expect(mockClient.insert).toHaveBeenCalled();
      const insertArg = (mockClient.insert.mock?.calls?.[0] as any[][] | undefined)?.[0]?.[0];
      expect(insertArg?.status).toBe('not-started');
      expect(result).toEqual(project);
    });

    test('should respect provided status', async () => {
      const project = makeProject({ status: 'in-progress' });
      mockClient.single.mockResolvedValue({ data: project, error: null });

      await service.createProject(
        { name: 'Project', user_id: 'user-1', status: 'in-progress' },
        mockClient as any
      );

      const insertArg = (mockClient.insert.mock?.calls?.[0] as any[][] | undefined)?.[0]?.[0];
      expect(insertArg?.status).toBe('in-progress');
    });

    test('should normalize deadline to midnight', async () => {
      const project = makeProject({ deadline: '2025-06-01T00:00:00.000Z' as any });
      mockClient.single.mockResolvedValue({ data: project, error: null });

      await service.createProject(
        {
          name: 'Project',
          user_id: 'user-1',
          deadline: new Date('2025-06-01T15:30:00'),
        },
        mockClient as any
      );

      const insertArg = (mockClient.insert.mock?.calls?.[0] as any[][] | undefined)?.[0]?.[0];
      // Deadline must be at midnight (hours=0)
      const normalizedDeadline = new Date(insertArg?.deadline);
      expect(normalizedDeadline.getHours()).toBe(0);
      expect(normalizedDeadline.getMinutes()).toBe(0);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createProject(
          { name: 'Project', user_id: 'user-1' },
          mockClient as any
        )
      ).rejects.toThrow('Failed to create project: Insert failed');
    });
  });

  // ─── updateProject ────────────────────────────────────────────────────────────
  describe('updateProject', () => {
    test('should update project fields', async () => {
      const updated = makeProject({ name: 'Renamed', status: 'in-progress' });
      mockClient.single.mockResolvedValue({ data: updated, error: null });

      const result = await service.updateProject(
        'proj-1',
        { name: 'Renamed', status: 'in-progress' },
        mockClient as any
      );

      expect(mockClient.update).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'proj-1');
      expect(result).toEqual(updated);
    });

    test('should only include provided fields in update payload', async () => {
      const updated = makeProject({ description: 'New desc' });
      mockClient.single.mockResolvedValue({ data: updated, error: null });

      await service.updateProject(
        'proj-1',
        { description: 'New desc' },
        mockClient as any
      );

      const updateArg = (mockClient.update.mock?.calls?.[0] as any[] | undefined)?.[0];
      expect(updateArg.description).toBe('New desc');
      expect(updateArg.name).toBeUndefined();
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.updateProject('proj-1', { name: 'x' }, mockClient as any)
      ).rejects.toThrow('Failed to update project: Update failed');
    });
  });

  // ─── deleteProject ────────────────────────────────────────────────────────────
  describe('deleteProject', () => {
    test('should delete a project and return true', async () => {
      const eqMock = jest.fn() as any;
      eqMock.mockResolvedValue({ error: null });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      const result = await service.deleteProject('proj-1', mockClient as any);

      expect(mockClient.from).toHaveBeenCalledWith('projects');
      expect(eqMock).toHaveBeenCalledWith('id', 'proj-1');
      expect(result).toBe(true);
    });

    test('should throw on database error', async () => {
      const eqMock = jest.fn() as any;
      eqMock.mockResolvedValue({ error: { message: 'Delete failed' } });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      await expect(service.deleteProject('proj-1', mockClient as any)).rejects.toThrow(
        'Failed to delete project: Delete failed'
      );
    });
  });

  // ─── getProjectsByStatus ──────────────────────────────────────────────────────
  describe('getProjectsByStatus', () => {
    test('should return projects filtered by status', async () => {
      const projects = [makeProject({ status: 'in-progress' })];
      mockClient.order.mockResolvedValue({ data: projects, error: null });

      const result = await service.getProjectsByStatus('in-progress', mockClient as any);

      expect(mockClient.eq).toHaveBeenCalledWith('status', 'in-progress');
      expect(result).toEqual(projects);
    });

    test('should return empty array when none match', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getProjectsByStatus('completed', mockClient as any);

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Filter failed' },
      });

      await expect(
        service.getProjectsByStatus('not-started', mockClient as any)
      ).rejects.toThrow('Failed to fetch projects by status: Filter failed');
    });
  });
});
