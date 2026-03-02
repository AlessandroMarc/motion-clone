import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── Mock the Motion API service before importing the migration service ────────
const mockMotionApiService = {
  getMe: jest.fn(),
  listSchedules: jest.fn(),
  listWorkspaces: jest.fn(),
  listProjects: jest.fn(),
  listTasks: jest.fn(),
  listRecurringTasks: jest.fn(),
};

jest.unstable_mockModule('../services/motionApiService.js', () => ({
  MotionApiService: jest.fn().mockImplementation(() => mockMotionApiService),
}));

// ── Mock the Supabase config before importing services ────────────────────────
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
};

jest.unstable_mockModule('../config/supabase.js', () => ({
  serviceRoleSupabase: mockSupabaseClient,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockSupabaseClient),
  verifyAuthToken: jest.fn(),
}));

// ── Import module under test after mocking deps ───────────────────────────────
const {
  mapPriority,
  mapDuration,
  mapMotionTaskToCreateInput,
  MotionMigrationService,
} = await import('../services/motionMigrationService.js');

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockUser = { id: 'motion-user-1', email: 'test@example.com' };
const mockWorkspace = { id: 'ws-1', name: 'My Workspace' };
const mockProject = {
  id: 'mp-1',
  name: 'Motion Project',
  description: 'A project',
  workspaceId: 'ws-1',
  status: { name: 'Active', isDefaultStatus: true, isResolvedStatus: false },
};
const mockTask = {
  id: 'mt-1',
  name: 'Motion Task',
  description: 'A task',
  duration: 60,
  dueDate: '2024-12-31T00:00:00.000Z',
  deadlineType: 'SOFT' as const,
  parentRecurringTaskId: undefined,
  completed: false,
  creator: mockUser,
  workspace: mockWorkspace,
  status: { name: 'Todo', isDefaultStatus: true, isResolvedStatus: false },
  priority: 'HIGH' as const,
  labels: [],
  assignees: [mockUser],
  createdTime: '2024-01-01T00:00:00.000Z',
  schedulingIssue: false,
  project: { id: 'mp-1', name: 'Motion Project', workspaceId: 'ws-1' },
};
const mockRecurringTask = {
  id: 'mrt-1',
  name: 'Recurring Task',
  creator: mockUser,
  assignee: mockUser,
  workspace: mockWorkspace,
  status: { name: 'Todo', isDefaultStatus: true, isResolvedStatus: false },
  priority: 'MEDIUM' as const,
  labels: [],
  project: { id: 'mp-1', name: 'Motion Project', workspaceId: 'ws-1' },
  duration: 30,
};

// ── Unit tests for pure mapping helpers ───────────────────────────────────────
describe('mapPriority', () => {
  test('maps ASAP to high', () => {
    expect(mapPriority('ASAP')).toBe('high');
  });

  test('maps HIGH to high', () => {
    expect(mapPriority('HIGH')).toBe('high');
  });

  test('maps MEDIUM to medium', () => {
    expect(mapPriority('MEDIUM')).toBe('medium');
  });

  test('maps LOW to low', () => {
    expect(mapPriority('LOW')).toBe('low');
  });
});

describe('mapDuration', () => {
  test('returns duration in minutes for a numeric value', () => {
    expect(mapDuration(90)).toBe(90);
  });

  test('returns 0 for "NONE"', () => {
    expect(mapDuration('NONE')).toBe(0);
  });

  test('returns 0 for "REMINDER"', () => {
    expect(mapDuration('REMINDER')).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(mapDuration(undefined)).toBe(0);
  });

  test('returns 0 for a non-positive numeric value', () => {
    expect(mapDuration(0)).toBe(0);
  });
});

describe('mapMotionTaskToCreateInput', () => {
  test('maps a regular MotionTask correctly', () => {
    const input = mapMotionTaskToCreateInput(mockTask, 'user-123', 'proj-456');
    expect(input.title).toBe('Motion Task');
    expect(input.priority).toBe('high');
    expect(input.planned_duration_minutes).toBe(60);
    expect(input.project_id).toBe('proj-456');
    expect(input.user_id).toBe('user-123');
    expect(input.due_date).toEqual(new Date('2024-12-31T00:00:00.000Z'));
  });

  test('prefixes title with [Recurring] for recurring tasks', () => {
    const input = mapMotionTaskToCreateInput(
      mockRecurringTask,
      'user-123',
      'proj-456',
      true
    );
    expect(input.title).toBe('[Recurring] Recurring Task');
  });

  test('maps MEDIUM priority correctly', () => {
    const input = mapMotionTaskToCreateInput(
      mockRecurringTask,
      'user-123',
      undefined,
      true
    );
    expect(input.priority).toBe('medium');
    expect(input.project_id).toBeUndefined();
  });

  test('handles task with no dueDate', () => {
    const taskNoDue = { ...mockTask, dueDate: undefined };
    const input = mapMotionTaskToCreateInput(taskNoDue, 'user-123');
    expect(input.due_date).toBeNull();
  });
});

// ── Integration-style tests for MotionMigrationService ───────────────────────
describe('MotionMigrationService', () => {
  const MOCK_AUTH_TOKEN = 'mock-nexto-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default happy-path returns
    mockMotionApiService.getMe.mockResolvedValue(mockUser);
    mockMotionApiService.listSchedules.mockResolvedValue([
      { name: 'Work Hours', isDefaultTimezone: true, timezone: 'UTC', schedule: {} },
    ]);
    mockMotionApiService.listWorkspaces.mockResolvedValue([mockWorkspace]);
    mockMotionApiService.listProjects.mockResolvedValue([mockProject]);
    mockMotionApiService.listTasks.mockResolvedValue([mockTask]);
    mockMotionApiService.listRecurringTasks.mockResolvedValue([
      mockRecurringTask,
    ]);
  });

  test('returns a MigrationResult with correct counts on success', async () => {
    // Project creation
    mockSupabaseClient.single
      .mockResolvedValueOnce({
        data: { id: 'nexto-proj-1', name: 'Motion Project', status: 'not-started', user_id: 'u-1', milestones: [], deadline: null, createdAt: new Date(), updatedAt: new Date() },
        error: null,
      })
      // Regular task creation
      .mockResolvedValueOnce({
        data: { id: 'nexto-task-1', title: 'Motion Task', status: 'not-started', user_id: 'u-1', priority: 'high', planned_duration_minutes: 60, actual_duration_minutes: 0, due_date: null, dependencies: [], created_at: new Date(), updated_at: new Date() },
        error: null,
      })
      // Recurring task creation
      .mockResolvedValueOnce({
        data: { id: 'nexto-task-2', title: '[Recurring] Recurring Task', status: 'not-started', user_id: 'u-1', priority: 'medium', planned_duration_minutes: 30, actual_duration_minutes: 0, due_date: null, dependencies: [], created_at: new Date(), updated_at: new Date() },
        error: null,
      });

    const service = new MotionMigrationService('test-api-key');
    const result = await service.migrate('u-1', MOCK_AUTH_TOKEN);

    expect(result.userId).toBe('motion-user-1');
    expect(result.schedulesFound).toBe(1);
    expect(result.totalProjectsImported).toBe(1);
    expect(result.totalTasksImported).toBe(1);
    expect(result.totalRecurringTasksImported).toBe(1);
    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0].errors).toHaveLength(0);
  });

  test('records errors per workspace when project creation fails', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const service = new MotionMigrationService('test-api-key');
    const result = await service.migrate('u-1', MOCK_AUTH_TOKEN);

    expect(result.totalProjectsImported).toBe(0);
    expect(result.workspaces[0].errors.length).toBeGreaterThan(0);
    expect(result.workspaces[0].errors[0]).toContain('Failed to import project');
  });

  test('records error and continues when listProjects API call fails', async () => {
    mockMotionApiService.listProjects.mockRejectedValue(
      new Error('Rate limit exceeded')
    );
    // tasks / recurring can still succeed (but they need a project entry)
    mockMotionApiService.listTasks.mockResolvedValue([]);
    mockMotionApiService.listRecurringTasks.mockResolvedValue([]);

    const service = new MotionMigrationService('test-api-key');
    const result = await service.migrate('u-1', MOCK_AUTH_TOKEN);

    expect(result.workspaces[0].errors.some(e =>
      e.includes('Failed to fetch projects')
    )).toBe(true);
    expect(result.totalProjectsImported).toBe(0);
  });
});
