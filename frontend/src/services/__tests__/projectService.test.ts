import { describe, expect, it, beforeEach, jest } from '@jest/globals';

jest.mock('@/lib/auth', () => ({
  getAuthToken: jest.fn(async () => null),
}));

const mockRunAutoSchedule = jest.fn(async () => ({
  unchanged: true,
  eventsCreated: 0,
  eventsDeleted: 0,
  violations: 0,
}));

jest.mock('../calendarService', () => ({
  calendarService: {
    runAutoSchedule: mockRunAutoSchedule,
  },
}));

import { projectService } from '../projectService';

function makeJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-type'
          ? 'application/json'
          : (null as string | null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeRawProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    deadline: '2026-03-15T00:00:00.000Z',
    created_at: '2026-03-05T10:00:00.000Z',
    updated_at: '2026-03-05T10:00:00.000Z',
    user_id: 'user-1',
    ...overrides,
  };
}

describe('projectService auto-schedule triggering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () =>
      makeJsonResponse({
        success: true,
        data: makeRawProject(),
        message: 'ok',
      })
    ) as unknown as typeof fetch;
  });

  it('createProject does NOT trigger runAutoSchedule (backend handles it)', async () => {
    await projectService.createProject({
      name: 'New Project',
      description: 'Test description',
      status: 'active',
      deadline: new Date(2026, 2, 15),
    });

    // Verify runAutoSchedule was never called - backend event queue handles auto-scheduling
    expect(mockRunAutoSchedule).not.toHaveBeenCalled();
  });

  it('updateProject does NOT trigger runAutoSchedule (backend handles it)', async () => {
    await projectService.updateProject('project-1', {
      name: 'Updated Project',
    });

    // Verify runAutoSchedule was never called - backend event queue handles auto-scheduling
    expect(mockRunAutoSchedule).not.toHaveBeenCalled();
  });

  it('deleteProject does NOT trigger runAutoSchedule (backend handles it)', async () => {
    global.fetch = jest.fn(async () =>
      makeJsonResponse({
        success: true,
        message: 'Project deleted',
      })
    ) as unknown as typeof fetch;

    await projectService.deleteProject('project-1');

    // Verify runAutoSchedule was never called - backend event queue handles auto-scheduling
    expect(mockRunAutoSchedule).not.toHaveBeenCalled();
  });
});
