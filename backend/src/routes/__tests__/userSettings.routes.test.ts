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

const mockUserSettingsService = {
  getActiveSchedule: jest.fn(),
  getUserSchedules: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  getUserSettings: jest.fn(),
  upsertUserSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  getOnboardingStatus: jest.fn(),
  updateOnboardingStep: jest.fn(),
  completeOnboarding: jest.fn(),
};
jest.unstable_mockModule('../../services/userSettingsService.js', () => ({
  UserSettingsService: jest
    .fn()
    .mockImplementation(() => mockUserSettingsService),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: userSettingsRouter } = await import('../userSettings.js');

const app: Express = express();
app.use(express.json());
app.use('/api/user-settings', userSettingsRouter);

// ── fixtures ──────────────────────────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };
const sampleSchedule = {
  id: 's1',
  name: 'Default',
  user_id: 'user-1',
  working_hours_start: 9,
  working_hours_end: 22,
  is_default: true,
};
const sampleSettings = {
  id: 'set1',
  user_id: 'user-1',
  active_schedule_id: null,
};
const sampleOnboarding = {
  completed: false,
  step: null,
  started_at: null,
  completed_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/user-settings/active-schedule ────────────────────────────────────
describe('GET /api/user-settings/active-schedule', () => {
  test('returns active schedule', async () => {
    mockUserSettingsService.getActiveSchedule.mockResolvedValue(sampleSchedule);
    const res = await supertest(app)
      .get('/api/user-settings/active-schedule')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('s1');
    expect(mockUserSettingsService.getActiveSchedule).toHaveBeenCalledWith(
      'user-1',
      'fake-test-token'
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/user-settings/active-schedule');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/user-settings/schedules ─────────────────────────────────────────
describe('GET /api/user-settings/schedules', () => {
  test('returns all schedules', async () => {
    mockUserSettingsService.getUserSchedules.mockResolvedValue([
      sampleSchedule,
    ]);
    const res = await supertest(app)
      .get('/api/user-settings/schedules')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── POST /api/user-settings/schedules ────────────────────────────────────────
describe('POST /api/user-settings/schedules', () => {
  test('creates a schedule and returns 201', async () => {
    mockUserSettingsService.createSchedule.mockResolvedValue(sampleSchedule);
    const res = await supertest(app)
      .post('/api/user-settings/schedules')
      .set(AUTH_HEADER)
      .send({ name: 'Default', working_hours_start: 9, working_hours_end: 22 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('s1');
  });

  test('returns 400 when service throws', async () => {
    mockUserSettingsService.createSchedule.mockRejectedValue(
      new Error('Validation error')
    );
    const res = await supertest(app)
      .post('/api/user-settings/schedules')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── PUT /api/user-settings/schedules/:id ─────────────────────────────────────
describe('PUT /api/user-settings/schedules/:id', () => {
  test('updates a schedule', async () => {
    const updated = { ...sampleSchedule, name: 'Updated' };
    mockUserSettingsService.updateSchedule.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/user-settings/schedules/s1')
      .set(AUTH_HEADER)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
    expect(mockUserSettingsService.updateSchedule).toHaveBeenCalledWith(
      's1',
      'user-1',
      { name: 'Updated' },
      'fake-test-token'
    );
  });
});

// ── DELETE /api/user-settings/schedules/:id ───────────────────────────────────
describe('DELETE /api/user-settings/schedules/:id', () => {
  test('deletes a schedule and returns 200', async () => {
    mockUserSettingsService.deleteSchedule.mockResolvedValue(undefined);
    const res = await supertest(app)
      .delete('/api/user-settings/schedules/s1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

// ── GET /api/user-settings ────────────────────────────────────────────────────
describe('GET /api/user-settings', () => {
  test('returns user settings', async () => {
    mockUserSettingsService.getUserSettings.mockResolvedValue(sampleSettings);
    const res = await supertest(app).get('/api/user-settings').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('set1');
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get('/api/user-settings');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/user-settings ───────────────────────────────────────────────────
describe('POST /api/user-settings', () => {
  test('upserts user settings and returns 201', async () => {
    mockUserSettingsService.upsertUserSettings.mockResolvedValue(
      sampleSettings
    );
    const res = await supertest(app)
      .post('/api/user-settings')
      .set(AUTH_HEADER)
      .send({ active_schedule_id: null });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('set1');
  });
});

// ── PUT /api/user-settings ────────────────────────────────────────────────────
describe('PUT /api/user-settings', () => {
  test('updates user settings', async () => {
    const updated = { ...sampleSettings, active_schedule_id: 's1' };
    mockUserSettingsService.updateUserSettings.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/user-settings')
      .set(AUTH_HEADER)
      .send({ active_schedule_id: 's1' });
    expect(res.status).toBe(200);
    expect(res.body.data.active_schedule_id).toBe('s1');
  });
});

// ── GET /api/user-settings/onboarding/status ─────────────────────────────────
describe('GET /api/user-settings/onboarding/status', () => {
  test('returns onboarding status', async () => {
    mockUserSettingsService.getOnboardingStatus.mockResolvedValue(
      sampleOnboarding
    );
    const res = await supertest(app)
      .get('/api/user-settings/onboarding/status')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(false);
  });
});

// ── PUT /api/user-settings/onboarding/step ───────────────────────────────────
describe('PUT /api/user-settings/onboarding/step', () => {
  test('updates onboarding step', async () => {
    const updated = { ...sampleOnboarding, step: 'task_created' };
    mockUserSettingsService.updateOnboardingStep.mockResolvedValue(updated);
    const res = await supertest(app)
      .put('/api/user-settings/onboarding/step')
      .set(AUTH_HEADER)
      .send({ step: 'task_created' });
    expect(res.status).toBe(200);
    expect(res.body.data.step).toBe('task_created');
    expect(mockUserSettingsService.updateOnboardingStep).toHaveBeenCalledWith(
      'user-1',
      'task_created',
      'fake-test-token'
    );
  });

  test('returns 400 for invalid onboarding step', async () => {
    const res = await supertest(app)
      .put('/api/user-settings/onboarding/step')
      .set(AUTH_HEADER)
      .send({ step: 'invalid_step' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── PUT /api/user-settings/onboarding/complete ───────────────────────────────
describe('PUT /api/user-settings/onboarding/complete', () => {
  test('completes onboarding', async () => {
    const completed = { ...sampleOnboarding, completed: true };
    mockUserSettingsService.completeOnboarding.mockResolvedValue(completed);
    const res = await supertest(app)
      .put('/api/user-settings/onboarding/complete')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(true);
    expect(mockUserSettingsService.completeOnboarding).toHaveBeenCalledWith(
      'user-1',
      'fake-test-token'
    );
  });
});
