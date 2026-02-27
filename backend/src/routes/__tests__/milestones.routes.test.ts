import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Express } from 'express';

// ── mock modules BEFORE any dynamic import ───────────────────────────────────
const mockMilestoneService = {
  getAllMilestones: jest.fn(),
  getMilestoneById: jest.fn(),
  createMilestone: jest.fn(),
  updateMilestone: jest.fn(),
  deleteMilestone: jest.fn(),
  getMilestonesByProjectId: jest.fn(),
  getMilestonesByStatus: jest.fn(),
};
jest.unstable_mockModule('../../services/milestoneService.js', () => ({
  MilestoneService: jest.fn().mockImplementation(() => mockMilestoneService),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: milestoneRouter } = await import('../milestones.js');

const app: Express = express();
app.use(express.json());
app.use('/api/milestones', milestoneRouter);

// ── fixtures ──────────────────────────────────────────────────────────────────
const sampleMilestone = {
  id: 'm1',
  title: 'Milestone 1',
  project_id: 'p1',
  status: 'not-started',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/milestones ───────────────────────────────────────────────────────
describe('GET /api/milestones', () => {
  test('returns all milestones', async () => {
    mockMilestoneService.getAllMilestones.mockResolvedValue([sampleMilestone]);
    const res = await supertest(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('filters by project_id', async () => {
    mockMilestoneService.getMilestonesByProjectId.mockResolvedValue([
      sampleMilestone,
    ]);
    const res = await supertest(app).get('/api/milestones?project_id=p1');
    expect(res.status).toBe(200);
    expect(mockMilestoneService.getMilestonesByProjectId).toHaveBeenCalledWith(
      'p1'
    );
  });

  test('filters by status', async () => {
    mockMilestoneService.getMilestonesByStatus.mockResolvedValue([
      sampleMilestone,
    ]);
    const res = await supertest(app).get('/api/milestones?status=not-started');
    expect(res.status).toBe(200);
    expect(mockMilestoneService.getMilestonesByStatus).toHaveBeenCalledWith(
      'not-started'
    );
  });

  test('returns 500 when service throws', async () => {
    mockMilestoneService.getAllMilestones.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app).get('/api/milestones');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/milestones/:id ───────────────────────────────────────────────────
describe('GET /api/milestones/:id', () => {
  test('returns a milestone by id', async () => {
    mockMilestoneService.getMilestoneById.mockResolvedValue(sampleMilestone);
    const res = await supertest(app).get('/api/milestones/m1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('m1');
  });

  test('returns 404 when milestone not found', async () => {
    mockMilestoneService.getMilestoneById.mockResolvedValue(null);
    const res = await supertest(app).get('/api/milestones/missing');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when service throws', async () => {
    mockMilestoneService.getMilestoneById.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app).get('/api/milestones/m1');
    expect(res.status).toBe(500);
  });
});

// ── POST /api/milestones ──────────────────────────────────────────────────────
describe('POST /api/milestones', () => {
  test('creates a milestone and returns 201', async () => {
    mockMilestoneService.createMilestone.mockResolvedValue(sampleMilestone);
    const res = await supertest(app)
      .post('/api/milestones')
      .send({ title: 'Milestone 1', project_id: 'p1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('m1');
  });

  test('returns 400 when service throws', async () => {
    mockMilestoneService.createMilestone.mockRejectedValue(
      new Error('Validation error')
    );
    const res = await supertest(app)
      .post('/api/milestones')
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── PUT /api/milestones/:id ───────────────────────────────────────────────────
describe('PUT /api/milestones/:id', () => {
  test('updates a milestone', async () => {
    const updated = { ...sampleMilestone, title: 'Updated' };
    mockMilestoneService.updateMilestone.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/milestones/m1')
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  test('returns 400 when service throws', async () => {
    mockMilestoneService.updateMilestone.mockRejectedValue(
      new Error('Not found')
    );
    const res = await supertest(app)
      .put('/api/milestones/m1')
      .send({ title: 'x' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/milestones/:id ────────────────────────────────────────────────
describe('DELETE /api/milestones/:id', () => {
  test('deletes a milestone and returns 200', async () => {
    mockMilestoneService.deleteMilestone.mockResolvedValue(undefined);
    const res = await supertest(app).delete('/api/milestones/m1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 when service throws', async () => {
    mockMilestoneService.deleteMilestone.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app).delete('/api/milestones/m1');
    expect(res.status).toBe(500);
  });
});
