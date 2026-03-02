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

const mockGoogleCalendarService = {
  initiateOAuth: jest.fn(),
  handleOAuthCallback: jest.fn(),
  getConnectionStatus: jest.fn(),
  syncEventsFromGoogle: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
};
jest.unstable_mockModule('../../services/googleCalendarService.js', () => ({
  GoogleCalendarService: jest
    .fn()
    .mockImplementation(() => mockGoogleCalendarService),
}));

jest.unstable_mockModule('../../config/env.js', () => ({
  getFrontendUrl: jest.fn().mockReturnValue('http://localhost:3000'),
  getGoogleOAuthEnv: jest.fn(),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: googleCalendarRouter } = await import('../googleCalendar.js');

const app: Express = express();
app.use(express.json());
app.use('/api/google-calendar', googleCalendarRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ── fixtures ──────────────────────────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };

// ── GET /api/google-calendar/auth ─────────────────────────────────────────────
describe('GET /api/google-calendar/auth', () => {
  test('redirects to OAuth URL', async () => {
    mockGoogleCalendarService.initiateOAuth.mockReturnValue(
      'https://accounts.google.com/oauth?state=user-1'
    );
    const res = await supertest(app)
      .get('/api/google-calendar/auth?user_id=user-1')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
    expect(mockGoogleCalendarService.initiateOAuth).toHaveBeenCalledWith(
      'user-1'
    );
  });

  test('returns 400 when user_id is missing', async () => {
    const res = await supertest(app).get('/api/google-calendar/auth');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/google-calendar/callback ────────────────────────────────────────
describe('GET /api/google-calendar/callback', () => {
  test('redirects to frontend with success on valid callback', async () => {
    mockGoogleCalendarService.handleOAuthCallback.mockResolvedValue({
      success: true,
    });
    const res = await supertest(app)
      .get('/api/google-calendar/callback?code=xyz&state=user-1')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_calendar_connected=true');
    expect(mockGoogleCalendarService.handleOAuthCallback).toHaveBeenCalledWith(
      'xyz',
      'user-1'
    );
  });

  test('redirects with error when OAuth error param is present', async () => {
    const res = await supertest(app)
      .get('/api/google-calendar/callback?error=access_denied')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'google_calendar_error=access_denied'
    );
  });

  test('redirects with error when code or state is missing', async () => {
    const res = await supertest(app)
      .get('/api/google-calendar/callback')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'google_calendar_error=missing_code_or_state'
    );
  });

  test('redirects with error when handleOAuthCallback returns failure', async () => {
    mockGoogleCalendarService.handleOAuthCallback.mockResolvedValue({
      success: false,
      error: 'token_exchange_failed',
    });
    const res = await supertest(app)
      .get('/api/google-calendar/callback?code=bad&state=user-1')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      'google_calendar_error=token_exchange_failed'
    );
  });
});

// ── GET /api/google-calendar/status ──────────────────────────────────────────
describe('GET /api/google-calendar/status', () => {
  test('returns connection status', async () => {
    mockGoogleCalendarService.getConnectionStatus.mockResolvedValue({
      connected: true,
    });
    const res = await supertest(app)
      .get('/api/google-calendar/status?user_id=user-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.connected).toBe(true);
    expect(mockGoogleCalendarService.getConnectionStatus).toHaveBeenCalledWith(
      'user-1'
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).get(
      '/api/google-calendar/status?user_id=user-1'
    );
    expect(res.status).toBe(401);
  });

  test('returns 400 when user_id is missing', async () => {
    const res = await supertest(app)
      .get('/api/google-calendar/status')
      .set(AUTH_HEADER);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when service throws', async () => {
    mockGoogleCalendarService.getConnectionStatus.mockRejectedValue(
      new Error('DB error')
    );
    const res = await supertest(app)
      .get('/api/google-calendar/status?user_id=user-1')
      .set(AUTH_HEADER);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ── POST /api/google-calendar/sync ───────────────────────────────────────────
describe('POST /api/google-calendar/sync', () => {
  test('syncs events successfully', async () => {
    mockGoogleCalendarService.syncEventsFromGoogle.mockResolvedValue({
      success: true,
      synced: 5,
      errors: [],
    });
    const res = await supertest(app)
      .post('/api/google-calendar/sync')
      .set(AUTH_HEADER)
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.synced).toBe(5);
    expect(mockGoogleCalendarService.syncEventsFromGoogle).toHaveBeenCalledWith(
      'user-1'
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/sync')
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(401);
  });

  test('returns 500 when sync fails', async () => {
    mockGoogleCalendarService.syncEventsFromGoogle.mockResolvedValue({
      success: false,
      synced: 0,
      errors: ['token expired'],
    });
    const res = await supertest(app)
      .post('/api/google-calendar/sync')
      .set(AUTH_HEADER)
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when user_id is missing', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/sync')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── DELETE /api/google-calendar/disconnect ────────────────────────────────────
describe('DELETE /api/google-calendar/disconnect', () => {
  test('disconnects Google Calendar', async () => {
    mockGoogleCalendarService.disconnectGoogleCalendar.mockResolvedValue(
      undefined
    );
    const res = await supertest(app)
      .delete('/api/google-calendar/disconnect')
      .set(AUTH_HEADER)
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      mockGoogleCalendarService.disconnectGoogleCalendar
    ).toHaveBeenCalledWith('user-1');
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app)
      .delete('/api/google-calendar/disconnect')
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(401);
  });

  test('returns 400 when user_id is missing', async () => {
    const res = await supertest(app)
      .delete('/api/google-calendar/disconnect')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
