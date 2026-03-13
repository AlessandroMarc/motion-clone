import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import type { Task } from '../../types/database.js';

// Mock Supabase client – methods chain and return the client or results
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClient: any = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
};

// Mock supabase BEFORE importing anything that uses it
jest.unstable_mockModule('../../config/supabase.js', () => ({
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const mockAutoScheduleTriggerQueue = {
  trigger: jest.fn(),
  triggerAndWait: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn(),
  cancelAll: jest.fn(),
};

// Mock autoScheduleTriggerQueue to prevent actual scheduling during tests
jest.unstable_mockModule('../autoScheduleTriggerQueue.js', () => ({
  autoScheduleTriggerQueue: mockAutoScheduleTriggerQueue,
}));

const { TaskService } = await import('../taskService.js');

const makeTask = (overrides: Partial<Task> = {}): Task => {
  const base: Omit<Task, 'project_id'> = {
    is_recurring: false,
    id: 'task-1',
    title: 'Test task',
    description: 'desc',
    due_date: null,
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blockedBy: [],
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    schedule_id: 'schedule-1',
  };

  const { project_id, ...rest } = overrides;

  return {
    ...base,
    ...(project_id !== undefined ? { project_id } : {}),
    ...rest,
  } as Task;
};

describe('TaskService', () => {
  let service: InstanceType<typeof TaskService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all methods chain back to mockClient
    const keys = ['from', 'select', 'insert', 'update', 'eq', 'order', 'limit'];
    for (const key of keys) {
      const mock = mockClient[key];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new TaskService();
  });

  afterEach(async () => {
    // Clean up any pending auto-schedule triggers
    try {
      const mod = await import('../autoScheduleTriggerQueue.js');
      if (
        mod.autoScheduleTriggerQueue &&
        mod.autoScheduleTriggerQueue.cancelAll
      ) {
        mod.autoScheduleTriggerQueue.cancelAll();
      }
    } catch {
      // Silently ignore cleanup errors
    }
  });

  // ─── getAllTasks ──────────────────────────────────────────────────────────────
  describe('getAllTasks', () => {
    test('should return all tasks', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getAllTasks(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(result).toEqual(tasks);
    });

    test('should return empty array when no tasks', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getAllTasks(mockClient);

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getAllTasks(mockClient)).rejects.toThrow(
        'Failed to fetch tasks: DB error'
      );
    });
  });

  // ─── getTaskById ─────────────────────────────────────────────────────────────
  describe('getTaskById', () => {
    test('should return task when found', async () => {
      const task = makeTask();
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.getTaskById('task-1', mockClient);

      expect(mockClient.eq).toHaveBeenCalledWith('id', 'task-1');
      expect(result).toEqual(task);
    });

    test('should return null when task not found (PGRST116)', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getTaskById('missing', mockClient);

      expect(result).toBeNull();
    });

    test('should throw on other database errors', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Connection failed' },
      });

      await expect(service.getTaskById('task-1', mockClient)).rejects.toThrow(
        'Failed to fetch task: Connection failed'
      );
    });
  });

  // ─── createTask ──────────────────────────────────────────────────────────────
  describe('createTask', () => {
    test('should create a task with correct status (not-started when actualDuration=0)', async () => {
      const task = makeTask({ status: 'not-started' });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Test task',
          priority: 'medium',
          user_id: 'user-1',
          planned_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      expect(mockClient.insert).toHaveBeenCalled();
      expect(result).toEqual(task);
    });

    test('should trigger auto-schedule asynchronously when created with token', async () => {
      const task = makeTask({ user_id: 'user-1' });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      await service.createTask(
        { title: 'Task', user_id: 'user-1', planned_duration_minutes: 60 },
        mockClient,
        'token'
      );

      expect(mockAutoScheduleTriggerQueue.trigger).toHaveBeenCalledWith(
        'user-1',
        'token'
      );
    });

    test('should set status to in-progress when 0 < actual < planned', async () => {
      const task = makeTask({
        status: 'in-progress',
        actual_duration_minutes: 30,
      });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Task',
          priority: 'high',
          user_id: 'user-1',
          planned_duration_minutes: 60,
          actual_duration_minutes: 30,
        },
        mockClient,
        'token'
      );

      expect(result.status).toBe('in-progress');
    });

    test('should set status to completed when actual >= planned', async () => {
      const task = makeTask({
        status: 'completed',
        actual_duration_minutes: 60,
      });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Task',
          priority: 'low',
          user_id: 'user-1',
          planned_duration_minutes: 60,
          actual_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      expect(result.status).toBe('completed');
    });

    test('should normalize negative planned duration to 0', async () => {
      const task = makeTask({ planned_duration_minutes: 0 });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Task',
          priority: 'low',
          user_id: 'user-1',
          planned_duration_minutes: -10,
        },
        mockClient,
        'token'
      );

      expect(result).toBeDefined();
      expect(mockClient.insert).toHaveBeenCalled();
    });

    test('should throw on database error', async () => {
      // Mock returns null when trying to find or verify schedule
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock insert to fail
      mockClient.insert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          // @ts-expect-error - jest mock typing limitation
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' },
          } as any),
        }),
      } as any);

      await expect(
        service.createTask(
          {
            title: 'Task',
            priority: 'medium',
            user_id: 'user-1',
            planned_duration_minutes: 60,
          },
          mockClient,
          'token'
        )
      ).rejects.toThrow();
    });

    test('should include schedule_id in insert payload', async () => {
      const task = makeTask({ schedule_id: 'schedule-2' });

      // Mock verification of schedule ownership
      mockClient.single.mockResolvedValueOnce({
        data: { id: 'schedule-2' },
        error: null,
      });

      // Mock task creation
      mockClient.single.mockResolvedValueOnce({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Task',
          priority: 'medium',
          user_id: 'user-1',
          schedule_id: 'schedule-2',
          planned_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      expect(result.schedule_id).toBe('schedule-2');
    });
  });

  // ─── updateTask ──────────────────────────────────────────────────────────────
  describe('updateTask', () => {
    test('should update a task', async () => {
      const existingTask = makeTask();
      const updatedTask = makeTask({ title: 'Updated' });

      // getTaskById - first single call
      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null })
        // update result - second single call
        .mockResolvedValueOnce({ data: updatedTask, error: null });

      const result = await service.updateTask(
        'task-1',
        { title: 'Updated' },
        mockClient,
        'token'
      );

      expect(result?.title).toBe('Updated');
    });

    test('should trigger auto-schedule synchronously when update affects scheduling', async () => {
      const existingTask = makeTask({ user_id: 'user-1' });
      const updatedTask = makeTask({ due_date: '2025-01-01' as any });

      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null }) // getTaskById
        .mockResolvedValueOnce({ data: updatedTask, error: null }); // update result

      await service.updateTask(
        'task-1',
        { due_date: new Date('2025-01-01'), user_id: 'user-1' },
        mockClient,
        'token'
      );

      expect(mockAutoScheduleTriggerQueue.triggerAndWait).toHaveBeenCalledWith(
        'user-1',
        'token'
      );
    });

    test('should throw when task not found during update', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(
        service.updateTask('missing', { title: 'x' }, mockClient)
      ).rejects.toThrow('Task not found');
    });

    test('should persist schedule_id updates', async () => {
      const existingTask = makeTask({ schedule_id: 'schedule-1' });
      const updatedTask = makeTask({ schedule_id: 'schedule-2' });

      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null }) // getTaskById
        .mockResolvedValueOnce({ data: { id: 'schedule-2' }, error: null }) // schedule verification
        .mockResolvedValueOnce({ data: updatedTask, error: null }); // update result

      const result = await service.updateTask(
        'task-1',
        { schedule_id: 'schedule-2', user_id: 'user-1' },
        mockClient,
        'token'
      );

      expect(result?.schedule_id).toBe('schedule-2');
    });

    test('should update future linked recurring session durations when planned duration changes', async () => {
      const existingTask = makeTask({
        id: 'task-1',
        is_recurring: true,
        planned_duration_minutes: 60,
      });
      const updatedTask = makeTask({
        id: 'task-1',
        is_recurring: true,
        planned_duration_minutes: 90,
      });

      const recurringEventStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const expectedEndTime = new Date(new Date(recurringEventStart).getTime() + 90 * 60000).toISOString();

      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null })
        .mockResolvedValueOnce({ data: updatedTask, error: null });

      // Mock the query chain used to fetch future recurring events
      mockClient.is = jest.fn().mockReturnValue(mockClient);
      mockClient.gte = jest.fn();
      mockClient.gte.mockResolvedValueOnce({
        data: [{ id: 'event-1', start_time: recurringEventStart }],
        error: null,
      });

      mockClient.eq
        .mockImplementationOnce(() => mockClient) // getTaskById
        .mockImplementationOnce(() => mockClient) // update task
        .mockImplementationOnce(() => mockClient) // select recurring events
        .mockResolvedValueOnce({ data: [], error: null }); // update event

      await service.updateTask(
        'task-1',
        { planned_duration_minutes: 90 },
        mockClient,
        'token'
      );

      expect(mockClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          end_time: expectedEndTime,
          updated_at: expect.any(String),
        })
      );
    });
  });

  // ─── deleteTask ──────────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    test('should delete related calendar events before deleting the task', async () => {
      // Set up task retrieval mock for getTaskById
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: makeTask({ id: 'task-1' }),
            error: null,
          }),
        }),
      });

      // Set up calendar event deletion mock
      const calendarEqMock = jest.fn() as any;
      calendarEqMock.mockResolvedValue({ error: null });
      const calendarDeleteMock = jest.fn().mockReturnValue({
        eq: calendarEqMock,
      });

      // Set up task deletion mock
      const taskEqMock = jest.fn() as any;
      taskEqMock.mockResolvedValue({ error: null });
      const taskDeleteMock = jest.fn().mockReturnValue({ eq: taskEqMock });

      // Set up mockClient.from to return different mocks based on table name
      mockClient.from.mockImplementation((tableName: string) => {
        if (tableName === 'calendar_events') {
          return { delete: calendarDeleteMock };
        }
        if (tableName === 'tasks') {
          return { select: selectMock, delete: taskDeleteMock };
        }
        return mockClient;
      });

      const result = await service.deleteTask('task-1', mockClient, 'token');

      // Verify calendar events were deleted first
      expect(mockClient.from).toHaveBeenCalledWith('calendar_events');
      expect(calendarDeleteMock).toHaveBeenCalled();
      expect(calendarEqMock).toHaveBeenCalledWith('linked_task_id', 'task-1');

      // Verify task was deleted after
      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(taskDeleteMock).toHaveBeenCalled();
      expect(taskEqMock).toHaveBeenCalledWith('id', 'task-1');

      expect(result).toBe(true);
    });

    test('should trigger auto-schedule synchronously when deleted with token', async () => {
      const existingTask = makeTask({ user_id: 'user-1', id: 'task-1' });

      // getTaskById mock
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: existingTask, error: null }),
        }),
      });

      // calendar deletion mock
      const calendarDeleteMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      // task deletion mock
      const taskDeleteMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockClient.from.mockImplementation((tableName: string) => {
        if (tableName === 'calendar_events')
          return { delete: calendarDeleteMock };
        if (tableName === 'tasks')
          return { select: selectMock, delete: taskDeleteMock };
        return mockClient;
      });

      await service.deleteTask('task-1', mockClient, 'token');

      expect(mockAutoScheduleTriggerQueue.triggerAndWait).toHaveBeenCalledWith(
        'user-1',
        'token'
      );
    });

    test('should throw if calendar event deletion fails', async () => {
      // Set up task retrieval mock for getTaskById
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: makeTask({ id: 'task-1' }),
            error: null,
          }),
        }),
      });

      const calendarEqMock = jest.fn() as any;
      calendarEqMock.mockResolvedValue({
        error: { message: 'Calendar delete failed' },
      });
      const calendarDeleteMock = jest.fn().mockReturnValue({
        eq: calendarEqMock,
      });

      mockClient.from.mockImplementation((tableName: string) => {
        if (tableName === 'calendar_events') {
          return { delete: calendarDeleteMock };
        }
        if (tableName === 'tasks') {
          return { select: selectMock };
        }
        return mockClient;
      });

      await expect(service.deleteTask('task-1', mockClient)).rejects.toThrow(
        'Failed to delete related calendar events: Calendar delete failed'
      );
    });

    test('should throw if task deletion fails after calendar events are deleted', async () => {
      // Set up task retrieval mock for getTaskById
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: makeTask({ id: 'task-1' }),
            error: null,
          }),
        }),
      });

      // Set up calendar event deletion mock (succeeds)
      const calendarEqMock = jest.fn() as any;
      calendarEqMock.mockResolvedValue({ error: null });
      const calendarDeleteMock = jest.fn().mockReturnValue({
        eq: calendarEqMock,
      });

      // Set up task deletion mock (fails)
      const taskEqMock = jest.fn() as any;
      taskEqMock.mockResolvedValue({
        error: { message: 'Task delete failed' },
      });
      const taskDeleteMock = jest.fn().mockReturnValue({ eq: taskEqMock });

      mockClient.from.mockImplementation((tableName: string) => {
        if (tableName === 'calendar_events') {
          return { delete: calendarDeleteMock };
        }
        if (tableName === 'tasks') {
          return { select: selectMock, delete: taskDeleteMock };
        }
        return mockClient;
      });

      await expect(service.deleteTask('task-1', mockClient)).rejects.toThrow(
        'Failed to delete task: Task delete failed'
      );
    });
  });

  // ─── getTasksByProjectId ─────────────────────────────────────────────────────
  describe('getTasksByProjectId', () => {
    test('should return tasks for a given project', async () => {
      const tasks = [makeTask({ project_id: 'proj-1' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getTasksByProjectId('proj-1', mockClient);

      expect(mockClient.eq).toHaveBeenCalledWith('project_id', 'proj-1');
      expect(result).toEqual(tasks);
    });

    test('should return empty array when no tasks in project', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getTasksByProjectId('proj-empty', mockClient);

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      await expect(service.getTasksByProjectId('proj-1', mockClient)).rejects.toThrow(
        'Failed to fetch tasks by project: Query failed'
      );
    });
  });

  // ─── getTasksByStatus ────────────────────────────────────────────────────────
  describe('getTasksByStatus', () => {
    test('should return tasks with given status', async () => {
      const tasks = [makeTask({ status: 'not-started' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getTasksByStatus('not-started', mockClient);

      expect(mockClient.eq).toHaveBeenCalledWith('status', 'not-started');
      expect(result).toEqual(tasks);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Status query failed' },
      });

      await expect(service.getTasksByStatus('completed', mockClient)).rejects.toThrow(
        'Failed to fetch tasks by status: Status query failed'
      );
    });
  });

  // ─── Schedule Resolution Optimization Tests ──────────────────────────────────
  describe('createTask - schedule resolution optimization', () => {
    test('should use provided schedule_id directly', async () => {
      const task = makeTask({ schedule_id: 'provided-schedule-1' });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      await service.createTask(
        {
          title: 'Task',
          priority: 'medium',
          user_id: 'user-1',
          schedule_id: 'provided-schedule-1',
          planned_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      // Verify the task was created with the provided schedule_id
      const insertCall = mockClient.insert.mock?.calls?.[0]?.[0] as
        | any[]
        | undefined;
      expect(insertCall?.[0]?.schedule_id).toBe('provided-schedule-1');
    });

    test('should resolve schedule from active or default without provided schedule_id', async () => {
      const task = makeTask({ schedule_id: 'resolved-schedule' });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Task',
          priority: 'medium',
          user_id: 'user-1',
          planned_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      expect(result).toBeDefined();
      expect(result.schedule_id).toBeDefined();
      expect(mockClient.insert).toHaveBeenCalled();
    });

    test('should resolve schedule_id from linked project if provided, when schedule_id is missing', async () => {
      const task = makeTask({ schedule_id: 'project-schedule' });

      // First call to single() is for project lookup, second is for schedule ownership check, third is for insert
      mockClient.single
        .mockResolvedValueOnce({
          data: { schedule_id: 'project-schedule' },
          error: null,
        })
        .mockResolvedValueOnce({ data: { id: 'project-schedule' }, error: null }) // schedule ownership check
        .mockResolvedValueOnce({ data: task, error: null });

      await service.createTask(
        {
          title: 'Task',
          priority: 'medium',
          user_id: 'user-1',
          project_id: 'project-1',
          planned_duration_minutes: 60,
        },
        mockClient,
        'token'
      );

      const insertCall = mockClient.insert.mock?.calls?.[0]?.[0] as
        | any[]
        | undefined;
      expect(insertCall?.[0]?.schedule_id).toBe('project-schedule');
    });
  });
});
