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

const mockTaskService = {
  getAllTasks: jest.fn(),
  getTaskById: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  getTasksByProjectId: jest.fn(),
  getTasksByStatus: jest.fn(),
};
jest.unstable_mockModule('../../services/taskService.js', () => ({
  TaskService: jest.fn().mockImplementation(() => mockTaskService),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: taskRouter } = await import('../tasks.js');

const app: Express = express();
app.use(express.json());
app.use('/api/tasks', taskRouter);

// ── fixtures ──────────────────────────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };
const sampleTask = {
  id: 't1',
  title: 'Task 1',
  user_id: 'user-1',
  status: 'not-started',
  schedule_id: 'schedule-1',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/tasks ────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  test('returns all tasks', async () => {
    mockTaskService.getAllTasks.mockResolvedValue([sampleTask]);
    const res = await supertest(app).get('/api/tasks').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockTaskService.getAllTasks).toHaveBeenCalledWith('fake-test-token');
  });

  test('filters by project_id', async () => {
    mockTaskService.getTasksByProjectId.mockResolvedValue([sampleTask]);
    const res = await supertest(app)
      .get('/api/tasks?project_id=p1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(mockTaskService.getTasksByProjectId).toHaveBeenCalledWith(
      'p1',
      'fake-test-token'
    );
  });

  test('filters by status', async () => {
    mockTaskService.getTasksByStatus.mockResolvedValue([sampleTask]);
    const res = await supertest(app)
      .get('/api/tasks?status=not-started')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(mockTaskService.getTasksByStatus).toHaveBeenCalledWith(
      'not-started',
      'fake-test-token'
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  test('returns 500 when service throws', async () => {
    mockTaskService.getAllTasks.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app).get('/api/tasks').set(AUTH_HEADER);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/tasks/:id ────────────────────────────────────────────────────────
describe('GET /api/tasks/:id', () => {
  test('returns a task by id', async () => {
    mockTaskService.getTaskById.mockResolvedValue(sampleTask);
    const res = await supertest(app).get('/api/tasks/t1').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('t1');
  });

  test('returns 404 when task not found', async () => {
    mockTaskService.getTaskById.mockResolvedValue(null);
    const res = await supertest(app).get('/api/tasks/missing').set(AUTH_HEADER);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when service throws', async () => {
    mockTaskService.getTaskById.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app).get('/api/tasks/t1').set(AUTH_HEADER);
    expect(res.status).toBe(500);
  });
});

// ── POST /api/tasks ───────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  test('creates a task and returns 201', async () => {
    mockTaskService.createTask.mockResolvedValue(sampleTask);
    const res = await supertest(app)
      .post('/api/tasks')
      .set(AUTH_HEADER)
      .send({ title: 'Task 1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('t1');
  });

  test('returns 400 when service throws', async () => {
    mockTaskService.createTask.mockRejectedValue(new Error('Validation error'));
    const res = await supertest(app)
      .post('/api/tasks')
      .set(AUTH_HEADER)
      .send({ title: 'Bad Task' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('forwards schedule_id and auth user to service', async () => {
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    await supertest(app)
      .post('/api/tasks')
      .set(AUTH_HEADER)
      .send({ title: 'Task 1', schedule_id: 'schedule-1' });

    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task 1',
        schedule_id: 'schedule-1',
        user_id: 'user-1',
      }),
      'fake-test-token'
    );
  });
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────────
describe('PUT /api/tasks/:id', () => {
  test('updates a task', async () => {
    const updated = { ...sampleTask, title: 'Updated' };
    mockTaskService.updateTask.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/tasks/t1')
      .set(AUTH_HEADER)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  test('returns 400 when service throws', async () => {
    mockTaskService.updateTask.mockRejectedValue(new Error('Not found'));
    const res = await supertest(app)
      .put('/api/tasks/t1')
      .set(AUTH_HEADER)
      .send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('forwards schedule_id on update', async () => {
    mockTaskService.updateTask.mockResolvedValue(sampleTask);

    await supertest(app)
      .put('/api/tasks/t1')
      .set(AUTH_HEADER)
      .send({ schedule_id: 'schedule-2' });

    expect(mockTaskService.updateTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ schedule_id: 'schedule-2' }),
      'fake-test-token'
    );
  });
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  test('deletes a task and returns 200', async () => {
    mockTaskService.deleteTask.mockResolvedValue(undefined);
    const res = await supertest(app).delete('/api/tasks/t1').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 when service throws', async () => {
    mockTaskService.deleteTask.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app).delete('/api/tasks/t1').set(AUTH_HEADER);
    expect(res.status).toBe(500);
  });
});
