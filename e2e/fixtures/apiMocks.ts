/**
 * Shared API mock fixtures for E2E tests.
 * Used with page.route() to intercept backend API calls.
 */

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Write unit tests',
    description: 'Cover all services',
    status: 'not-started',
    priority: 'high',
    due_date: null,
    project_id: null,
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    dependencies: [],
    blocked_by: [],
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Review pull request',
    description: '',
    status: 'in-progress',
    priority: 'medium',
    due_date: '2024-12-31T00:00:00Z',
    project_id: 'project-1',
    planned_duration_minutes: 30,
    actual_duration_minutes: 0,
    dependencies: [],
    blocked_by: [],
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project Alpha',
    description: 'A test project',
    status: 'in-progress',
    deadline: null,
    milestones: [],
    user_id: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'project-2',
    name: 'Test Project Beta',
    description: '',
    status: 'not-started',
    deadline: '2025-06-30T00:00:00Z',
    milestones: [],
    user_id: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const mockCalendarEvents = [
  {
    id: 'event-1',
    title: 'Team standup',
    start_time: '2099-06-15T09:00:00Z',
    end_time: '2099-06-15T09:30:00Z',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

/** Build a standard success API response envelope */
export function apiSuccess<T>(data: T, message = 'OK', count?: number) {
  return {
    success: true,
    message,
    data,
    ...(count !== undefined ? { count } : {}),
  };
}
