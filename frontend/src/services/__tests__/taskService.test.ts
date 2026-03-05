import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { normalizeToMidnight, toLocalDateString } from '@/utils/dateUtils';

jest.mock('@/lib/auth', () => ({
  getAuthToken: jest.fn(async () => null),
}));

jest.mock('../calendarService', () => ({
  calendarService: {
    runAutoSchedule: jest.fn(async () => ({
      unchanged: true,
      eventsCreated: 0,
      eventsDeleted: 0,
      violations: 0,
    })),
  },
}));

import { taskService } from '../taskService';

function makeJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-type' ? 'application/json' : null as string | null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeRawTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Case Form Duplication',
    description: '',
    due_date: '2026-03-05',
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blocked_by: [],
    project_id: null,
    created_at: '2026-03-05T10:00:00.000Z',
    updated_at: '2026-03-05T10:00:00.000Z',
    user_id: 'user-1',
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    schedule_id: 'sched-1',
    is_recurring: false,
    recurrence_pattern: null,
    recurrence_interval: 1,
    next_generation_cutoff: null,
    recurrence_start_date: null,
    start_date: null,
    ...overrides,
  };
}

describe('taskService due_date serialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () =>
      makeJsonResponse({
        success: true,
        data: makeRawTask(),
        message: 'ok',
      })
    ) as unknown as typeof fetch;
  });

  it('createTask sends due_date as local YYYY-MM-DD (not ISO timestamp)', async () => {
    const dueDate = new Date(2026, 2, 5); // Local March 5, 2026

    await taskService.createTask({
      title: 'Case Form Duplication',
      description: '',
      dueDate,
      priority: 'medium',
      project_id: undefined,
      plannedDurationMinutes: 60,
      actualDurationMinutes: 0,
      blockedBy: [],
      isRecurring: false,
      recurrencePattern: undefined,
      recurrenceInterval: 1,
      recurrenceStartDate: undefined,
      startDate: undefined,
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const [, options] = (fetchCalls[0] ?? []) as [string, RequestInit?];
    const body = JSON.parse(((options?.body as string) ?? '{}')) as {
      due_date?: string | null;
    };

    expect(body.due_date).toBe(toLocalDateString(normalizeToMidnight(dueDate)));
    expect(body.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.due_date).not.toContain('T');
  });

  it('updateTask sends due_date as local YYYY-MM-DD (not ISO timestamp)', async () => {
    const dueDate = new Date(2026, 2, 5); // Local March 5, 2026

    await taskService.updateTask('task-1', {
      dueDate,
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const [, options] = (fetchCalls[0] ?? []) as [string, RequestInit?];
    const body = JSON.parse(((options?.body as string) ?? '{}')) as {
      due_date?: string | null;
    };

    expect(body.due_date).toBe(toLocalDateString(normalizeToMidnight(dueDate)));
    expect(body.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.due_date).not.toContain('T');
  });
});
