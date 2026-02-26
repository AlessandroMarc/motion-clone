import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Task } from '../../types/database.js';

// Shared mock client – all chaining methods return it by default
const mockClient: Record<string, jest.Mock> = {
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
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const { TaskService } = await import('../taskService.js');

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test task',
  description: 'desc',
  due_date: null,
  priority: 'medium',
  status: 'pending',
  dependencies: [],
  blocked_by: [],
  project_id: null,
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  ...overrides,
});

describe('TaskService', () => {
  let service: InstanceType<typeof TaskService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all methods chain back to mockClient
    for (const key of ['from', 'select', 'insert', 'update', 'eq', 'order']) {
      mockClient[key].mockReturnValue(mockClient);
    }
    service = new TaskService();
  });

  // ─── getAllTasks ──────────────────────────────────────────────────────────────
  describe('getAllTasks', () => {
    test('should return all tasks', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getAllTasks('token');

      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(result).toEqual(tasks);
    });

    test('should return empty array when no tasks', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getAllTasks();

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getAllTasks()).rejects.toThrow('Failed to fetch tasks: DB error');
    });
  });

  // ─── getTaskById ─────────────────────────────────────────────────────────────
  describe('getTaskById', () => {
    test('should return task when found', async () => {
      const task = makeTask();
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.getTaskById('task-1', 'token');

      expect(mockClient.eq).toHaveBeenCalledWith('id', 'task-1');
      expect(result).toEqual(task);
    });

    test('should return null when task not found (PGRST116)', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getTaskById('missing', 'token');

      expect(result).toBeNull();
    });

    test('should throw on other database errors', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Connection failed' },
      });

      await expect(service.getTaskById('task-1')).rejects.toThrow(
        'Failed to fetch task: Connection failed'
      );
    });
  });

  // ─── createTask ──────────────────────────────────────────────────────────────
  describe('createTask', () => {
    test('should create a task with correct status (pending when actualDuration=0)', async () => {
      const task = makeTask({ status: 'pending' });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      const result = await service.createTask(
        {
          title: 'Test task',
          priority: 'medium',
          user_id: 'user-1',
          planned_duration_minutes: 60,
        },
        'token'
      );

      expect(mockClient.insert).toHaveBeenCalled();
      expect(result).toEqual(task);
    });

    test('should set status to in-progress when 0 < actual < planned', async () => {
      const task = makeTask({ status: 'in-progress', actual_duration_minutes: 30 });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      await service.createTask(
        {
          title: 'Task',
          priority: 'high',
          user_id: 'user-1',
          planned_duration_minutes: 60,
          actual_duration_minutes: 30,
        },
        'token'
      );

      const insertCall = mockClient.insert.mock.calls[0][0] as any[];
      expect(insertCall[0].status).toBe('in-progress');
    });

    test('should set status to completed when actual >= planned', async () => {
      const task = makeTask({ status: 'completed', actual_duration_minutes: 60 });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      await service.createTask(
        {
          title: 'Task',
          priority: 'low',
          user_id: 'user-1',
          planned_duration_minutes: 60,
          actual_duration_minutes: 60,
        },
        'token'
      );

      const insertCall = mockClient.insert.mock.calls[0][0] as any[];
      expect(insertCall[0].status).toBe('completed');
    });

    test('should normalize negative planned duration to 0', async () => {
      const task = makeTask({ planned_duration_minutes: 0 });
      mockClient.single.mockResolvedValue({ data: task, error: null });

      await service.createTask(
        {
          title: 'Task',
          priority: 'low',
          user_id: 'user-1',
          planned_duration_minutes: -10,
        },
        'token'
      );

      const insertCall = mockClient.insert.mock.calls[0][0] as any[];
      expect(insertCall[0].planned_duration_minutes).toBe(0);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createTask(
          {
            title: 'Task',
            priority: 'medium',
            user_id: 'user-1',
            planned_duration_minutes: 60,
          },
          'token'
        )
      ).rejects.toThrow('Failed to create task: Insert failed');
    });
  });

  // ─── updateTask ──────────────────────────────────────────────────────────────
  describe('updateTask', () => {
    test('should update a task', async () => {
      const existingTask = makeTask();
      const updatedTask = makeTask({ title: 'Updated' });
      // First call: getTaskById (single)
      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null })
        // Second call: update result (single)
        .mockResolvedValueOnce({ data: updatedTask, error: null });

      const result = await service.updateTask('task-1', { title: 'Updated' }, 'token');

      expect(result).toEqual(updatedTask);
    });

    test('should throw when task not found during update', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.updateTask('missing', { title: 'x' })).rejects.toThrow(
        'Task not found'
      );
    });

    test('should propagate title changes to linked calendar events', async () => {
      const existingTask = makeTask({ title: 'Old title' });
      const updatedTask = makeTask({ title: 'New title' });

      // getTaskById
      mockClient.single
        .mockResolvedValueOnce({ data: existingTask, error: null })
        // update result
        .mockResolvedValueOnce({ data: updatedTask, error: null });

      // calendar_events update chain (from -> update -> eq)
      const calendarEqMock = jest.fn().mockResolvedValue({ error: null });
      const calendarUpdateMock = jest.fn().mockReturnValue({ eq: calendarEqMock });

      // We need to intercept the second `from()` call for calendar_events
      mockClient.from
        .mockReturnValueOnce(mockClient) // first call: tasks (for getTaskById)
        .mockReturnValueOnce(mockClient) // second call: tasks (for update)
        .mockReturnValueOnce({ update: calendarUpdateMock }); // third call: calendar_events

      await service.updateTask('task-1', { title: 'New title' }, 'token');

      expect(calendarUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New title' })
      );
      expect(calendarEqMock).toHaveBeenCalledWith('linked_task_id', 'task-1');
    });
  });

  // ─── deleteTask ──────────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    test('should delete a task and return true', async () => {
      // delete().eq() is the terminal chain for deleteTask
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      const result = await service.deleteTask('task-1', 'token');

      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(mockClient.delete).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'task-1');
      expect(result).toBe(true);
    });

    test('should throw on database error', async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      mockClient.delete.mockReturnValue({ eq: eqMock });

      await expect(service.deleteTask('task-1')).rejects.toThrow(
        'Failed to delete task: Delete failed'
      );
    });
  });

  // ─── getTasksByProjectId ─────────────────────────────────────────────────────
  describe('getTasksByProjectId', () => {
    test('should return tasks for a given project', async () => {
      const tasks = [makeTask({ project_id: 'proj-1' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getTasksByProjectId('proj-1', 'token');

      expect(mockClient.eq).toHaveBeenCalledWith('project_id', 'proj-1');
      expect(result).toEqual(tasks);
    });

    test('should return empty array when no tasks in project', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getTasksByProjectId('proj-empty');

      expect(result).toEqual([]);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      await expect(service.getTasksByProjectId('proj-1')).rejects.toThrow(
        'Failed to fetch tasks by project: Query failed'
      );
    });
  });

  // ─── getTasksByStatus ────────────────────────────────────────────────────────
  describe('getTasksByStatus', () => {
    test('should return tasks with given status', async () => {
      const tasks = [makeTask({ status: 'pending' })];
      mockClient.order.mockResolvedValue({ data: tasks, error: null });

      const result = await service.getTasksByStatus('pending', 'token');

      expect(mockClient.eq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toEqual(tasks);
    });

    test('should throw on database error', async () => {
      mockClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Status query failed' },
      });

      await expect(service.getTasksByStatus('completed')).rejects.toThrow(
        'Failed to fetch tasks by status: Status query failed'
      );
    });
  });
});
