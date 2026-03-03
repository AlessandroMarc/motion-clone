import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Task } from '../../types/database.js';

interface MockClient {
  from: jest.Mock<any>;
  select: jest.Mock<any>;
  insert: jest.Mock<any>;
  update: jest.Mock<any>;
  eq: jest.Mock<any>;
  single: jest.Mock<any>;
  limit: jest.Mock<any>;
  [key: string]: jest.Mock<any>;
}

const mockClient: MockClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  limit: jest.fn(),
};

jest.unstable_mockModule('../../config/supabase.js', () => ({
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const { TaskService } = await import('../taskService.js');

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  title: 'Recurring task',
  description: 'desc',
  due_date: new Date('2026-03-15'),
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  is_recurring: false,
  recurrence_interval: 1,
  recurrence_pattern: null,
  next_generation_cutoff: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('TaskService - Recurrence integration', () => {
  let service: InstanceType<typeof TaskService>;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ['from', 'select', 'insert', 'update', 'eq', 'limit']) {
      mockClient[key].mockReturnValue(mockClient);
    }
    service = new TaskService();
  });

  test('createTask persists recurrence fields when recurring is enabled', async () => {
    mockClient.single
      .mockResolvedValueOnce({ data: { active_schedule_id: 'sched-1' }, error: null })
      .mockResolvedValueOnce({
        data: makeTask({
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_interval: 2,
          next_generation_cutoff: new Date('2026-03-15'),
        }),
        error: null,
      });

    await service.createTask({
      title: 'Weekly standup',
      priority: 'high',
      user_id: '22222222-2222-2222-2222-222222222222',
      planned_duration_minutes: 30,
      due_date: new Date('2026-03-15'),
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurrence_interval: 2,
    });

    const insertPayload = mockClient.insert.mock.calls[0][0][0];
    expect(insertPayload.is_recurring).toBe(true);
    expect(insertPayload.recurrence_pattern).toBe('weekly');
    expect(insertPayload.recurrence_interval).toBe(2);
    expect(insertPayload.next_generation_cutoff).toBeTruthy();
  });

  test('createTask clears recurrence fields when recurring is disabled', async () => {
    mockClient.single
      .mockResolvedValueOnce({ data: { active_schedule_id: 'sched-1' }, error: null })
      .mockResolvedValueOnce({ data: makeTask(), error: null });

    await service.createTask({
      title: 'One-off',
      priority: 'medium',
      user_id: '22222222-2222-2222-2222-222222222222',
      planned_duration_minutes: 45,
      is_recurring: false,
    });

    const insertPayload = mockClient.insert.mock.calls[0][0][0];
    expect(insertPayload.is_recurring).toBe(false);
    expect(insertPayload.recurrence_pattern).toBeNull();
    expect(insertPayload.recurrence_interval).toBe(1);
  });

  test('updateTask sets recurrence fields when enabling recurrence', async () => {
    mockClient.single
      .mockResolvedValueOnce({ data: makeTask(), error: null })
      .mockResolvedValueOnce({
        data: makeTask({
          is_recurring: true,
          recurrence_pattern: 'daily',
          recurrence_interval: 1,
        }),
        error: null,
      });

    await service.updateTask('11111111-1111-1111-1111-111111111111', {
      is_recurring: true,
      recurrence_pattern: 'daily',
      recurrence_interval: 1,
      due_date: new Date('2026-03-20'),
    });

    const updatePayload = mockClient.update.mock.calls[0][0];
    expect(updatePayload.is_recurring).toBe(true);
    expect(updatePayload.recurrence_pattern).toBe('daily');
    expect(updatePayload.recurrence_interval).toBe(1);
    expect(updatePayload.next_generation_cutoff).toBeTruthy();
  });

  test('updateTask clears recurrence fields when disabling recurrence', async () => {
    mockClient.single
      .mockResolvedValueOnce({
        data: makeTask({
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_interval: 2,
        }),
        error: null,
      })
      .mockResolvedValueOnce({ data: makeTask({ is_recurring: false }), error: null });

    await service.updateTask('11111111-1111-1111-1111-111111111111', {
      is_recurring: false,
    });

    const updatePayload = mockClient.update.mock.calls[0][0];
    expect(updatePayload.is_recurring).toBe(false);
    expect(updatePayload.recurrence_pattern).toBeNull();
    expect(updatePayload.recurrence_interval).toBe(1);
  });
});
