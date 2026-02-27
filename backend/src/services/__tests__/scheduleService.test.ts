import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Supabase client – methods chain and return the client or results
interface MockClient {
  from: jest.Mock<any>;
  select: jest.Mock<any>;
  insert: jest.Mock<any>;
  update: jest.Mock<any>;
  delete: jest.Mock<any>;
  eq: jest.Mock<any>;
  lte: jest.Mock<any>;
  or: jest.Mock<any>;
  single: jest.Mock<any>;
  order: jest.Mock<any>;
  limit: jest.Mock<any>;
  [key: string]: jest.Mock<any>;
}

const mockClient: MockClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  lte: jest.fn(),
  or: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
};

// Mock supabase BEFORE importing anything that uses it
jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: mockClient,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const { ScheduleService } = await import('../scheduleService.js');

const makeScheduleRaw = (overrides: Record<string, any> = {}) => ({
  id: 'schedule-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 9,
  working_hours_end: 17,
  is_default: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeProjectScheduleRaw = (overrides: Record<string, any> = {}) => ({
  id: 'ps-1',
  project_id: 'proj-1',
  schedule_id: 'schedule-1',
  effective_from: '2025-01-01T00:00:00Z',
  effective_to: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeTaskScheduleRaw = (overrides: Record<string, any> = {}) => ({
  id: 'ts-1',
  task_id: 'task-1',
  schedule_id: 'schedule-1',
  effective_from: '2025-01-01T00:00:00Z',
  effective_to: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('ScheduleService', () => {
  let service: InstanceType<typeof ScheduleService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all chain methods return mockClient
    for (const key of [
      'from',
      'select',
      'insert',
      'update',
      'delete',
      'eq',
      'lte',
      'or',
      'order',
      'limit',
    ]) {
      const mock = mockClient[key as keyof MockClient];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new ScheduleService();
  });

  // ─── getProjectSchedule ──────────────────────────────────────────────────────
  describe('getProjectSchedule', () => {
    test('should return active project schedule', async () => {
      const raw = makeProjectScheduleRaw();
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.getProjectSchedule('proj-1', 'token');

      expect(mockClient.from).toHaveBeenCalledWith('project_schedules');
      expect(result).not.toBeNull();
      expect(result?.project_id).toBe('proj-1');
      expect(result?.effective_from).toBeInstanceOf(Date);
    });

    test('should return null when no project schedule found (PGRST116)', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getProjectSchedule('proj-unknown', 'token');

      expect(result).toBeNull();
    });

    test('should throw on unexpected database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'DB error' },
      });

      await expect(service.getProjectSchedule('proj-1')).rejects.toThrow(
        'Failed to fetch project schedule: DB error'
      );
    });
  });

  // ─── createProjectSchedule ───────────────────────────────────────────────────
  describe('createProjectSchedule', () => {
    test('should create a project schedule', async () => {
      const raw = makeProjectScheduleRaw();
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.createProjectSchedule(
        {
          project_id: 'proj-1',
          schedule_id: 'schedule-1',
          effective_from: new Date('2025-01-01'),
        },
        'token'
      );

      expect(mockClient.from).toHaveBeenCalledWith('project_schedules');
      expect(mockClient.insert).toHaveBeenCalled();
      expect(result.project_id).toBe('proj-1');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createProjectSchedule({
          project_id: 'proj-1',
          schedule_id: 'schedule-1',
          effective_from: new Date(),
        })
      ).rejects.toThrow('Failed to create project schedule: Insert failed');
    });
  });

  // ─── updateProjectSchedule ───────────────────────────────────────────────────
  describe('updateProjectSchedule', () => {
    test('should update a project schedule', async () => {
      const raw = makeProjectScheduleRaw({ schedule_id: 'schedule-2' });
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.updateProjectSchedule(
        'ps-1',
        'proj-1',
        { schedule_id: 'schedule-2' },
        'token'
      );

      expect(mockClient.update).toHaveBeenCalled();
      expect(result.schedule_id).toBe('schedule-2');
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.updateProjectSchedule('ps-1', 'proj-1', {})
      ).rejects.toThrow('Failed to update project schedule: Update failed');
    });
  });

  // ─── deleteProjectSchedule ───────────────────────────────────────────────────
  describe('deleteProjectSchedule', () => {
    test('should delete a project schedule', async () => {
      mockClient.delete.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(
        service.deleteProjectSchedule('ps-1', 'proj-1', 'token')
      ).resolves.toBeUndefined();
    });

    test('should throw on database error', async () => {
      mockClient.delete.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      await expect(
        service.deleteProjectSchedule('ps-1', 'proj-1')
      ).rejects.toThrow('Failed to delete project schedule: Delete failed');
    });
  });

  // ─── getTaskSchedule ─────────────────────────────────────────────────────────
  describe('getTaskSchedule', () => {
    test('should return active task schedule', async () => {
      const raw = makeTaskScheduleRaw();
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.getTaskSchedule('task-1', 'token');

      expect(mockClient.from).toHaveBeenCalledWith('task_schedules');
      expect(result).not.toBeNull();
      expect(result?.task_id).toBe('task-1');
      expect(result?.effective_from).toBeInstanceOf(Date);
    });

    test('should return null when no task schedule found (PGRST116)', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getTaskSchedule('task-unknown');

      expect(result).toBeNull();
    });
  });

  // ─── createTaskSchedule ──────────────────────────────────────────────────────
  describe('createTaskSchedule', () => {
    test('should create a task schedule', async () => {
      const raw = makeTaskScheduleRaw();
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.createTaskSchedule(
        {
          task_id: 'task-1',
          schedule_id: 'schedule-1',
          effective_from: new Date('2025-01-01'),
        },
        'token'
      );

      expect(mockClient.from).toHaveBeenCalledWith('task_schedules');
      expect(result.task_id).toBe('task-1');
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createTaskSchedule({
          task_id: 'task-1',
          schedule_id: 'schedule-1',
          effective_from: new Date(),
        })
      ).rejects.toThrow('Failed to create task schedule: Insert failed');
    });
  });

  // ─── updateTaskSchedule ──────────────────────────────────────────────────────
  describe('updateTaskSchedule', () => {
    test('should update a task schedule', async () => {
      const raw = makeTaskScheduleRaw({ schedule_id: 'schedule-2' });
      mockClient.single.mockResolvedValue({ data: raw, error: null });

      const result = await service.updateTaskSchedule(
        'ts-1',
        'task-1',
        { schedule_id: 'schedule-2' },
        'token'
      );

      expect(mockClient.update).toHaveBeenCalled();
      expect(result.schedule_id).toBe('schedule-2');
    });
  });

  // ─── deleteTaskSchedule ──────────────────────────────────────────────────────
  describe('deleteTaskSchedule', () => {
    test('should delete a task schedule', async () => {
      mockClient.delete.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(
        service.deleteTaskSchedule('ts-1', 'task-1', 'token')
      ).resolves.toBeUndefined();
    });

    test('should throw on database error', async () => {
      mockClient.delete.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      await expect(
        service.deleteTaskSchedule('ts-1', 'task-1')
      ).rejects.toThrow('Failed to delete task schedule: Delete failed');
    });
  });

  // ─── getEffectiveSchedule ────────────────────────────────────────────────────
  describe('getEffectiveSchedule', () => {
    test('should return task schedule when active task schedule exists', async () => {
      const taskRaw = {
        id: 'task-1',
        project_id: 'proj-1',
        user_id: 'user-1',
      };
      const taskScheduleRow = {
        schedule_id: 'schedule-task',
        effective_from: '2020-01-01T00:00:00Z',
        effective_to: null,
      };
      const scheduleRaw = makeScheduleRaw({ id: 'schedule-task' });

      mockClient.single
        .mockResolvedValueOnce({ data: taskRaw, error: null }) // tasks fetch
        .mockResolvedValueOnce({ data: taskScheduleRow, error: null }) // task_schedules fetch
        .mockResolvedValueOnce({ data: scheduleRaw, error: null }); // schedules fetch

      const result = await service.getEffectiveSchedule('task-1', 'token');

      expect(result.id).toBe('schedule-task');
    });

    test('should fall back to project schedule when no task schedule', async () => {
      const taskRaw = {
        id: 'task-1',
        project_id: 'proj-1',
        user_id: 'user-1',
      };
      const projectScheduleRow = {
        schedule_id: 'schedule-project',
        effective_from: '2020-01-01T00:00:00Z',
        effective_to: null,
      };
      const scheduleRaw = makeScheduleRaw({ id: 'schedule-project' });

      mockClient.single
        .mockResolvedValueOnce({ data: taskRaw, error: null }) // tasks fetch
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // task_schedules: none
        .mockResolvedValueOnce({ data: projectScheduleRow, error: null }) // project_schedules fetch
        .mockResolvedValueOnce({ data: scheduleRaw, error: null }); // schedules fetch

      const result = await service.getEffectiveSchedule('task-1', 'token');

      expect(result.id).toBe('schedule-project');
    });

    test('should fall back to user default schedule when no task or project schedule', async () => {
      const taskRaw = {
        id: 'task-1',
        project_id: 'proj-1',
        user_id: 'user-1',
      };
      const userScheduleRaw = makeScheduleRaw({ id: 'schedule-user' });

      mockClient.single
        .mockResolvedValueOnce({ data: taskRaw, error: null }) // tasks fetch
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // task_schedules: none
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // project_schedules: none
        .mockResolvedValueOnce({ data: userScheduleRaw, error: null }); // schedules (user default)

      const result = await service.getEffectiveSchedule('task-1', 'token');

      expect(result.id).toBe('schedule-user');
    });

    test('should throw when task is not found', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(
        service.getEffectiveSchedule('task-unknown')
      ).rejects.toThrow('Task not found: task-unknown');
    });

    test('should throw when no schedule is found at any level', async () => {
      const taskRaw = {
        id: 'task-1',
        project_id: 'proj-1',
        user_id: 'user-1',
      };

      mockClient.single
        .mockResolvedValueOnce({ data: taskRaw, error: null }) // tasks fetch
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // task_schedules: none
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // project_schedules: none
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // user default: none

      await expect(
        service.getEffectiveSchedule('task-1')
      ).rejects.toThrow('No active schedule found for task task-1');
    });

    test('should skip project schedule check when task has no project_id', async () => {
      const taskRaw = {
        id: 'task-1',
        project_id: null,
        user_id: 'user-1',
      };
      const userScheduleRaw = makeScheduleRaw({ id: 'schedule-user' });

      mockClient.single
        .mockResolvedValueOnce({ data: taskRaw, error: null }) // tasks fetch
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // task_schedules: none
        // no project_schedules call expected
        .mockResolvedValueOnce({ data: userScheduleRaw, error: null }); // user default

      const result = await service.getEffectiveSchedule('task-1');

      expect(result.id).toBe('schedule-user');
      // from() called: tasks, task_schedules, schedules (user default) = 3 times
      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(mockClient.from).toHaveBeenCalledWith('task_schedules');
      expect(mockClient.from).not.toHaveBeenCalledWith('project_schedules');
    });
  });
});
