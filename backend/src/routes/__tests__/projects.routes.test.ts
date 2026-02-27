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

const mockProjectService = {
  getAllProjects: jest.fn(),
  getProjectById: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjectsByStatus: jest.fn(),
};
jest.unstable_mockModule('../../services/projectService.js', () => ({
  ProjectService: jest.fn().mockImplementation(() => mockProjectService),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: projectRouter } = await import('../projects.js');

const app: Express = express();
app.use(express.json());
app.use('/api/projects', projectRouter);

// ── fixtures ──────────────────────────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };
const sampleProject = {
  id: 'p1',
  name: 'Project 1',
  user_id: 'user-1',
  status: 'in-progress',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/projects ─────────────────────────────────────────────────────────
describe('GET /api/projects', () => {
  test('returns all projects', async () => {
    mockProjectService.getAllProjects.mockResolvedValue([sampleProject]);
    const res = await supertest(app).get('/api/projects').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('filters by status', async () => {
    mockProjectService.getProjectsByStatus.mockResolvedValue([sampleProject]);
    const res = await supertest(app)
      .get('/api/projects?status=in-progress')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(mockProjectService.getProjectsByStatus).toHaveBeenCalledWith(
      'in-progress',
      expect.anything()
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('returns 500 when service throws', async () => {
    mockProjectService.getAllProjects.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app).get('/api/projects').set(AUTH_HEADER);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
describe('GET /api/projects/:id', () => {
  test('returns a project by id', async () => {
    mockProjectService.getProjectById.mockResolvedValue(sampleProject);
    const res = await supertest(app).get('/api/projects/p1').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('p1');
  });

  test('returns 404 when project not found', async () => {
    mockProjectService.getProjectById.mockResolvedValue(null);
    const res = await supertest(app)
      .get('/api/projects/missing')
      .set(AUTH_HEADER);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when service throws', async () => {
    mockProjectService.getProjectById.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app).get('/api/projects/p1').set(AUTH_HEADER);
    expect(res.status).toBe(500);
  });
});

// ── POST /api/projects ────────────────────────────────────────────────────────
describe('POST /api/projects', () => {
  test('creates a project and returns 201', async () => {
    mockProjectService.createProject.mockResolvedValue(sampleProject);
    const res = await supertest(app)
      .post('/api/projects')
      .set(AUTH_HEADER)
      .send({ name: 'Project 1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('p1');
  });

  test('returns 400 when service throws', async () => {
    mockProjectService.createProject.mockRejectedValue(
      new Error('Validation error')
    );
    const res = await supertest(app)
      .post('/api/projects')
      .set(AUTH_HEADER)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
describe('PUT /api/projects/:id', () => {
  test('updates a project', async () => {
    const updated = { ...sampleProject, name: 'Updated' };
    mockProjectService.updateProject.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/projects/p1')
      .set(AUTH_HEADER)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  test('returns 400 when service throws', async () => {
    mockProjectService.updateProject.mockRejectedValue(new Error('Not found'));
    const res = await supertest(app)
      .put('/api/projects/p1')
      .set(AUTH_HEADER)
      .send({ name: 'x' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
describe('DELETE /api/projects/:id', () => {
  test('deletes a project and returns 200', async () => {
    mockProjectService.deleteProject.mockResolvedValue(undefined);
    const res = await supertest(app)
      .delete('/api/projects/p1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 when service throws', async () => {
    mockProjectService.deleteProject.mockRejectedValue(new Error('DB error'));
    const res = await supertest(app)
      .delete('/api/projects/p1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(500);
  });
});
