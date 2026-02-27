import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Express } from 'express';

// ── mock modules BEFORE any dynamic import ───────────────────────────────────
jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: {},
  serviceRoleSupabase: {},
  getAuthenticatedSupabase: jest.fn().mockReturnValue({}),
  verifyAuthToken: jest
    .fn()
    .mockReturnValue({ userId: 'user-1', exp: 9999999999 }),
}));

const mockScheduleService = {
  getProjectSchedule: jest.fn(),
  createProjectSchedule: jest.fn(),
  updateProjectSchedule: jest.fn(),
  deleteProjectSchedule: jest.fn(),
  getTaskSchedule: jest.fn(),
  createTaskSchedule: jest.fn(),
  updateTaskSchedule: jest.fn(),
  deleteTaskSchedule: jest.fn(),
  getEffectiveSchedule: jest.fn(),
};
jest.unstable_mockModule('../../services/scheduleService.js', () => ({
  ScheduleService: jest.fn().mockImplementation(() => mockScheduleService),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: scheduleRouter } = await import('../schedules.js');

const app: Express = express();
app.use(express.json());
app.use('/api/schedules', scheduleRouter);

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };

const sampleProjectSchedule = {
  id: 'ps-1',
  project_id: 'proj-1',
  schedule_id: 'schedule-1',
  effective_from: new Date('2025-01-01').toISOString(),
  effective_to: null,
  created_at: new Date('2025-01-01').toISOString(),
  updated_at: new Date('2025-01-01').toISOString(),
};

const sampleTaskSchedule = {
  id: 'ts-1',
  task_id: 'task-1',
  schedule_id: 'schedule-1',
  effective_from: new Date('2025-01-01').toISOString(),
  effective_to: null,
  created_at: new Date('2025-01-01').toISOString(),
  updated_at: new Date('2025-01-01').toISOString(),
};

const sampleSchedule = {
  id: 'schedule-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 9,
  working_hours_end: 17,
  is_default: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/schedules/projects/:projectId ────────────────────────────────────
describe('GET /api/schedules/projects/:projectId', () => {
  test('returns project schedule when found', async () => {
    mockScheduleService.getProjectSchedule.mockResolvedValue(
      sampleProjectSchedule
    );
    const res = await supertest(app)
      .get('/api/schedules/projects/proj-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project_id).toBe('proj-1');
  });

  test('returns 404 when project schedule not found', async () => {
    mockScheduleService.getProjectSchedule.mockResolvedValue(null);
    const res = await supertest(app)
      .get('/api/schedules/projects/proj-missing')
      .set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/schedules/projects/proj-1');
    expect(res.status).toBe(401);
  });

  test('returns 500 when service throws', async () => {
    mockScheduleService.getProjectSchedule.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app)
      .get('/api/schedules/projects/proj-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── POST /api/schedules/projects/:projectId ───────────────────────────────────
describe('POST /api/schedules/projects/:projectId', () => {
  test('creates and returns a project schedule', async () => {
    mockScheduleService.createProjectSchedule.mockResolvedValue(
      sampleProjectSchedule
    );
    const res = await supertest(app)
      .post('/api/schedules/projects/proj-1')
      .set(AUTH_HEADER)
      .send({ schedule_id: 'schedule-1', effective_from: '2025-01-01T00:00:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ps-1');
  });

  test('returns 400 when service throws', async () => {
    mockScheduleService.createProjectSchedule.mockRejectedValue(
      new Error('Bad input')
    );
    const res = await supertest(app)
      .post('/api/schedules/projects/proj-1')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/schedules/projects/:projectId/:id ──────────────────────────────
describe('PATCH /api/schedules/projects/:projectId/:id', () => {
  test('updates and returns a project schedule', async () => {
    const updated = { ...sampleProjectSchedule, schedule_id: 'schedule-2' };
    mockScheduleService.updateProjectSchedule.mockResolvedValue(updated);
    const res = await supertest(app)
      .patch('/api/schedules/projects/proj-1/ps-1')
      .set(AUTH_HEADER)
      .send({ schedule_id: 'schedule-2' });
    expect(res.status).toBe(200);
    expect(res.body.data.schedule_id).toBe('schedule-2');
  });

  test('returns 400 when service throws', async () => {
    mockScheduleService.updateProjectSchedule.mockRejectedValue(
      new Error('Not found')
    );
    const res = await supertest(app)
      .patch('/api/schedules/projects/proj-1/ps-1')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/schedules/projects/:projectId/:id ─────────────────────────────
describe('DELETE /api/schedules/projects/:projectId/:id', () => {
  test('deletes project schedule and returns 200', async () => {
    mockScheduleService.deleteProjectSchedule.mockResolvedValue(undefined);
    const res = await supertest(app)
      .delete('/api/schedules/projects/proj-1/ps-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 when service throws', async () => {
    mockScheduleService.deleteProjectSchedule.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app)
      .delete('/api/schedules/projects/proj-1/ps-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(500);
  });
});

// ── GET /api/schedules/tasks/:taskId ─────────────────────────────────────────
describe('GET /api/schedules/tasks/:taskId', () => {
  test('returns task schedule when found', async () => {
    mockScheduleService.getTaskSchedule.mockResolvedValue(sampleTaskSchedule);
    const res = await supertest(app)
      .get('/api/schedules/tasks/task-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.task_id).toBe('task-1');
  });

  test('returns 404 when task schedule not found', async () => {
    mockScheduleService.getTaskSchedule.mockResolvedValue(null);
    const res = await supertest(app)
      .get('/api/schedules/tasks/task-missing')
      .set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/schedules/tasks/task-1');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/schedules/tasks/:taskId ─────────────────────────────────────────
describe('POST /api/schedules/tasks/:taskId', () => {
  test('creates and returns a task schedule', async () => {
    mockScheduleService.createTaskSchedule.mockResolvedValue(sampleTaskSchedule);
    const res = await supertest(app)
      .post('/api/schedules/tasks/task-1')
      .set(AUTH_HEADER)
      .send({ schedule_id: 'schedule-1', effective_from: '2025-01-01T00:00:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('ts-1');
  });
});

// ── PATCH /api/schedules/tasks/:taskId/:id ────────────────────────────────────
describe('PATCH /api/schedules/tasks/:taskId/:id', () => {
  test('updates and returns a task schedule', async () => {
    const updated = { ...sampleTaskSchedule, schedule_id: 'schedule-2' };
    mockScheduleService.updateTaskSchedule.mockResolvedValue(updated);
    const res = await supertest(app)
      .patch('/api/schedules/tasks/task-1/ts-1')
      .set(AUTH_HEADER)
      .send({ schedule_id: 'schedule-2' });
    expect(res.status).toBe(200);
    expect(res.body.data.schedule_id).toBe('schedule-2');
  });
});

// ── DELETE /api/schedules/tasks/:taskId/:id ───────────────────────────────────
describe('DELETE /api/schedules/tasks/:taskId/:id', () => {
  test('deletes task schedule and returns 200', async () => {
    mockScheduleService.deleteTaskSchedule.mockResolvedValue(undefined);
    const res = await supertest(app)
      .delete('/api/schedules/tasks/task-1/ts-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/schedules/effective/:taskId ─────────────────────────────────────
describe('GET /api/schedules/effective/:taskId', () => {
  test('returns effective schedule for a task', async () => {
    mockScheduleService.getEffectiveSchedule.mockResolvedValue(sampleSchedule);
    const res = await supertest(app)
      .get('/api/schedules/effective/task-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('schedule-1');
  });

  test('returns 500 when no schedule found', async () => {
    mockScheduleService.getEffectiveSchedule.mockRejectedValue(
      new Error('No active schedule found for task task-1')
    );
    const res = await supertest(app)
      .get('/api/schedules/effective/task-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/schedules/effective/task-1');
    expect(res.status).toBe(401);
  });
});
