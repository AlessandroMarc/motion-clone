import { jest, describe, test, expect, beforeEach } from '@jest/globals';

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
  supabase: mockClient,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const { MilestoneService } = await import('../milestoneService.js');

const makeMilestone = (overrides: Record<string, any> = {}) => ({
  id: 'milestone-1',
  title: 'Test Milestone',
  description: 'desc',
  due_date: null,
  status: 'not-started',
  project_id: 'proj-1',
  user_id: 'user-1',
  created_at: new Date('2025-01-01T00:00:00Z'),
  updated_at: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('MilestoneService', () => {
  let service: InstanceType<typeof MilestoneService>;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ['from', 'select', 'insert', 'update', 'eq', 'order']) {
      const mock = mockClient[key as keyof MockClient];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new MilestoneService();
  });

  // ─── createMilestone ─────────────────────────────────────────────────────────
  describe('createMilestone', () => {
    test('should create a milestone', async () => {
      const milestone = makeMilestone();
      mockClient.single.mockResolvedValue({ data: milestone, error: null });

      const result = await service.createMilestone({
        title: 'Test Milestone',
        project_id: 'proj-1',
        user_id: 'user-1',
      });

      expect(mockClient.from).toHaveBeenCalledWith('milestones');
      expect(mockClient.insert).toHaveBeenCalled();
      expect(result).toEqual(milestone);
    });

    test('should use provided status', async () => {
      const milestone = makeMilestone({ status: 'in-progress' });
      mockClient.single.mockResolvedValue({ data: milestone, error: null });

      await service.createMilestone({
        title: 'Test',
        project_id: 'proj-1',
        user_id: 'user-1',
        status: 'in-progress',
      });

      const insertArg = (mockClient.insert.mock?.calls?.[0] as any[][] | undefined)?.[0]?.[0];
      expect(insertArg?.status).toBe('in-progress');
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createMilestone({ title: 'Test', project_id: 'proj-1', user_id: 'user-1' })
      ).rejects.toThrow('Failed to create milestone: Insert failed');
    });
  });

  // ─── getAllMilestones ─────────────────────────────────────────────────────────
  describe('getAllMilestones', () => {
    test('should return all milestones', async () => {
      const milestones = [makeMilestone({ id: 'm1' }), makeMilestone({ id: 'm2' })];
      mockClient.order.mockResolvedValue({ data: milestones, error: null });

      const result = await service.getAllMilestones();

      expect(mockClient.from).toHaveBeenCalledWith('milestones');
      expect(result).toEqual(milestones);
    });

    test('should return empty array when no milestones', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getAllMilestones();

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getAllMilestones()).rejects.toThrow(
        'Failed to fetch milestones: DB error'
      );
    });
  });

  // ─── getMilestoneById ─────────────────────────────────────────────────────────
  describe('getMilestoneById', () => {
    test('should return milestone when found', async () => {
      const milestone = makeMilestone();
      mockClient.single.mockResolvedValue({ data: milestone, error: null });

      const result = await service.getMilestoneById('milestone-1');

      expect(mockClient.eq).toHaveBeenCalledWith('id', 'milestone-1');
      expect(result).toEqual(milestone);
    });

    test('should return null on PGRST116', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getMilestoneById('missing');

      expect(result).toBeNull();
    });

    test('should throw on other database errors', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Connection failed' },
      });

      await expect(service.getMilestoneById('milestone-1')).rejects.toThrow(
        'Failed to fetch milestone: Connection failed'
      );
    });
  });

  // ─── updateMilestone ──────────────────────────────────────────────────────────
  describe('updateMilestone', () => {
    test('should update a milestone', async () => {
      const updated = makeMilestone({ title: 'Updated' });
      mockClient.single.mockResolvedValue({ data: updated, error: null });

      const result = await service.updateMilestone('milestone-1', { title: 'Updated' });

      expect(mockClient.update).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'milestone-1');
      expect(result).toEqual(updated);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.updateMilestone('milestone-1', { title: 'x' })
      ).rejects.toThrow('Failed to update milestone: Update failed');
    });
  });

  // ─── deleteMilestone ──────────────────────────────────────────────────────────
  describe('deleteMilestone', () => {
    test('should delete a milestone and return true', async () => {
      const eqMock = jest.fn() as any;
      eqMock.mockResolvedValue({ error: null });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      const result = await service.deleteMilestone('milestone-1');

      expect(mockClient.from).toHaveBeenCalledWith('milestones');
      expect(mockClient.delete).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'milestone-1');
      expect(result).toBe(true);
    });

    test('should throw on database error', async () => {
      const eqMock = jest.fn() as any;
      eqMock.mockResolvedValue({ error: { message: 'Delete failed' } });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      await expect(service.deleteMilestone('milestone-1')).rejects.toThrow(
        'Failed to delete milestone: Delete failed'
      );
    });
  });

  // ─── getMilestonesByProjectId ─────────────────────────────────────────────────
  describe('getMilestonesByProjectId', () => {
    test('should return milestones for a project', async () => {
      const milestones = [makeMilestone({ project_id: 'proj-1' })];
      mockClient.order.mockResolvedValue({ data: milestones, error: null });

      const result = await service.getMilestonesByProjectId('proj-1');

      expect(mockClient.eq).toHaveBeenCalledWith('project_id', 'proj-1');
      expect(result).toEqual(milestones);
    });

    test('should return empty array when no milestones in project', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getMilestonesByProjectId('proj-empty');

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      await expect(service.getMilestonesByProjectId('proj-1')).rejects.toThrow(
        'Failed to fetch milestones by project: Query failed'
      );
    });
  });

  // ─── getMilestonesByStatus ────────────────────────────────────────────────────
  describe('getMilestonesByStatus', () => {
    test('should return milestones with given status', async () => {
      const milestones = [makeMilestone({ status: 'in-progress' })];
      mockClient.order.mockResolvedValue({ data: milestones, error: null });

      const result = await service.getMilestonesByStatus('in-progress');

      expect(mockClient.eq).toHaveBeenCalledWith('status', 'in-progress');
      expect(result).toEqual(milestones);
    });

    test('should return empty array when none match', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getMilestonesByStatus('completed');

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Status query failed' },
      });

      await expect(service.getMilestonesByStatus('not-started')).rejects.toThrow(
        'Failed to fetch milestones by status: Status query failed'
      );
    });
  });
});
