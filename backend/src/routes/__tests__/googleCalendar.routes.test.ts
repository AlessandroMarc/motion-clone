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
  createGoogleEvent: jest.fn(),
  updateGoogleEvent: jest.fn(),
  deleteGoogleEvent: jest.fn(),
};
jest.unstable_mockModule('../../services/googleCalendarService.js', () => ({
  GoogleCalendarService: jest
    .fn()
    .mockImplementation(() => mockGoogleCalendarService),
}));

const mockCalendarEventService = {
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn(),
  getCalendarEventByGoogleEventId: jest.fn(),
};
jest.unstable_mockModule('../../services/calendarEventService.js', () => ({
  CalendarEventService: jest
    .fn()
    .mockImplementation(() => mockCalendarEventService),
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
      'user-1',
      'fake-test-token'
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

  test('returns 401 when authorization expired (invalid_grant)', async () => {
    mockGoogleCalendarService.syncEventsFromGoogle.mockResolvedValue({
      success: false,
      synced: 0,
      errors: ['google_calendar_invalid_grant', 'expired'],
    });
    const res = await supertest(app)
      .post('/api/google-calendar/sync')
      .set(AUTH_HEADER)
      .send({ user_id: 'user-1' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('expired');
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

// ── POST /api/google-calendar/events ────────────────────────────────────────
describe('POST /api/google-calendar/events', () => {
  test('creates event on Google Calendar and locally', async () => {
    mockGoogleCalendarService.createGoogleEvent.mockResolvedValue(
      'google-evt-123'
    );
    mockCalendarEventService.createCalendarEvent.mockResolvedValue({
      id: 'local-evt-1',
      title: 'Team meeting',
      description: 'Weekly sync',
      start_time: '2026-04-10T10:00:00.000Z',
      end_time: '2026-04-10T11:00:00.000Z',
      user_id: 'user-1',
      google_event_id: 'google-evt-123',
      synced_from_google: true,
    });

    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Team meeting',
        description: 'Weekly sync',
        start_time: '2026-04-10T10:00:00.000Z',
        end_time: '2026-04-10T11:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.google_event_id).toBe('google-evt-123');
    expect(mockGoogleCalendarService.createGoogleEvent).toHaveBeenCalledWith(
      'user-1',
      {
        title: 'Team meeting',
        description: 'Weekly sync',
        start_time: '2026-04-10T10:00:00.000Z',
        end_time: '2026-04-10T11:00:00.000Z',
      }
    );
    expect(mockCalendarEventService.createCalendarEvent).toHaveBeenCalledWith(
      {
        title: 'Team meeting',
        description: 'Weekly sync',
        start_time: '2026-04-10T10:00:00.000Z',
        end_time: '2026-04-10T11:00:00.000Z',
        user_id: 'user-1',
        google_event_id: 'google-evt-123',
        synced_from_google: true,
      },
      undefined,
      'fake-test-token'
    );
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).post('/api/google-calendar/events').send({
      title: 'Test',
      start_time: '2026-04-10T10:00:00Z',
      end_time: '2026-04-10T11:00:00Z',
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when title is missing', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        start_time: '2026-04-10T10:00:00Z',
        end_time: '2026-04-10T11:00:00Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when start_time is missing', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({ title: 'Test', end_time: '2026-04-10T11:00:00Z' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when end_time is missing', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({ title: 'Test', start_time: '2026-04-10T10:00:00Z' });
    expect(res.status).toBe(400);
  });

  test('returns 500 when Google API throws', async () => {
    mockGoogleCalendarService.createGoogleEvent.mockRejectedValue(
      new Error('Google API error')
    );
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: '2026-04-10T10:00:00Z',
        end_time: '2026-04-10T11:00:00Z',
      });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Google API error');
  });
});

// ── PUT /api/google-calendar/events/:googleEventId ──────────────────────────
describe('PUT /api/google-calendar/events/:googleEventId', () => {
  test('updates event on Google Calendar and locally', async () => {
    mockGoogleCalendarService.updateGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      title: 'Old title',
      google_event_id: 'google-evt-123',
    });
    mockCalendarEventService.updateCalendarEvent.mockResolvedValue({
      id: 'local-evt-1',
      title: 'Updated title',
      google_event_id: 'google-evt-123',
    });

    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated title');
    expect(mockGoogleCalendarService.updateGoogleEvent).toHaveBeenCalledWith(
      'user-1',
      'google-evt-123',
      { title: 'Updated title' }
    );
    expect(
      mockCalendarEventService.getCalendarEventByGoogleEventId
    ).toHaveBeenCalledWith('user-1', 'google-evt-123', 'fake-test-token');
  });

  test('returns 404 when local event not found', async () => {
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue(
      null
    );

    const res = await supertest(app)
      .put('/api/google-calendar/events/nonexistent-id')
      .set(AUTH_HEADER)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    // Google update should NOT have been called since local event was not found
    expect(mockGoogleCalendarService.updateGoogleEvent).not.toHaveBeenCalled();
  });

  test('returns 400 when only start_time is after stored end_time', async () => {
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
      start_time: '2026-04-10T10:00:00.000Z',
      end_time: '2026-04-10T11:00:00.000Z',
    });

    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ start_time: '2026-04-10T12:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('end_time must be after start_time');
    expect(mockGoogleCalendarService.updateGoogleEvent).not.toHaveBeenCalled();
  });

  test('returns 400 when only end_time is before stored start_time', async () => {
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
      start_time: '2026-04-10T10:00:00.000Z',
      end_time: '2026-04-10T11:00:00.000Z',
    });

    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ end_time: '2026-04-10T09:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('end_time must be after start_time');
    expect(mockGoogleCalendarService.updateGoogleEvent).not.toHaveBeenCalled();
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .send({ title: 'Updated' });
    expect(res.status).toBe(401);
  });

  test('returns 500 when Google API throws', async () => {
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
      start_time: '2026-04-10T10:00:00.000Z',
      end_time: '2026-04-10T11:00:00.000Z',
    });
    mockGoogleCalendarService.updateGoogleEvent.mockRejectedValue(
      new Error('Google API update error')
    );

    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Google API update error');
  });

  test('only sends provided fields as update data', async () => {
    mockGoogleCalendarService.updateGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
    });
    mockCalendarEventService.updateCalendarEvent.mockResolvedValue({
      id: 'local-evt-1',
      title: 'New title',
      description: 'New desc',
    });

    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ title: 'New title', description: 'New desc' });

    expect(res.status).toBe(200);
    // Verify only title and description are in the update payload (not start_time/end_time)
    const updateCall =
      mockCalendarEventService.updateCalendarEvent.mock.calls[0];
    expect(updateCall[0]).toBe('local-evt-1');
    expect(updateCall[1]).toEqual({
      title: 'New title',
      description: 'New desc',
    });
    // Should pass authToken (from the mocked middleware) instead of undefined
    expect(updateCall[2]).toBe('fake-test-token');
  });

  test('returns 400 when timestamps are invalid', async () => {
    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ start_time: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── POST /api/google-calendar/events — timestamp validation ─────────────────
describe('POST /api/google-calendar/events — timestamp validation', () => {
  test('returns 400 when start_time is invalid', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: 'invalid',
        end_time: '2026-04-10T11:00:00Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('valid timestamps');
  });

  test('returns 400 when end_time is before start_time', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: '2026-04-10T12:00:00Z',
        end_time: '2026-04-10T10:00:00Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('end_time must be after start_time');
  });

  test('returns 400 when start_time equals end_time (zero-duration event)', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: '2026-04-10T12:00:00Z',
        end_time: '2026-04-10T12:00:00Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('end_time must be after start_time');
    expect(mockGoogleCalendarService.createGoogleEvent).not.toHaveBeenCalled();
  });

  test('returns 400 when start_time is a number (non-string)', async () => {
    const res = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: 12345,
        end_time: '2026-04-10T11:00:00Z',
      });
    expect(res.status).toBe(400);
  });

  test('does not create local event when Google API throws', async () => {
    mockGoogleCalendarService.createGoogleEvent.mockRejectedValue(
      new Error('Google API down')
    );
    await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Test',
        start_time: '2026-04-10T10:00:00Z',
        end_time: '2026-04-10T11:00:00Z',
      });
    expect(mockCalendarEventService.createCalendarEvent).not.toHaveBeenCalled();
  });
});

// ── PUT /api/google-calendar/events/:id — additional edge cases ─────────────
describe('PUT /api/google-calendar/events/:id — additional edge cases', () => {
  test('returns 400 when both start_time and end_time are equal', async () => {
    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({
        start_time: '2026-04-10T10:00:00Z',
        end_time: '2026-04-10T10:00:00Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('end_time must be after start_time');
    expect(mockGoogleCalendarService.updateGoogleEvent).not.toHaveBeenCalled();
  });

  test('returns 400 when provided end_time is invalid', async () => {
    const res = await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ end_time: 'garbage' });
    expect(res.status).toBe(400);
    expect(mockGoogleCalendarService.updateGoogleEvent).not.toHaveBeenCalled();
  });

  test('does not update local event when Google update throws', async () => {
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
    });
    mockGoogleCalendarService.updateGoogleEvent.mockRejectedValue(
      new Error('Google API down')
    );
    await supertest(app)
      .put('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER)
      .send({ title: 'Updated' });
    expect(mockCalendarEventService.updateCalendarEvent).not.toHaveBeenCalled();
  });
});

// ── Full-flow: create → update → delete (Google events) ──────────────────────
describe('Full flow: create → update → delete Google Calendar event', () => {
  test('end-to-end round trip keeps local and Google in sync', async () => {
    // Create
    mockGoogleCalendarService.createGoogleEvent.mockResolvedValue('gev-1');
    mockCalendarEventService.createCalendarEvent.mockResolvedValue({
      id: 'local-1',
      google_event_id: 'gev-1',
      title: 'Initial',
      start_time: '2026-04-10T10:00:00.000Z',
      end_time: '2026-04-10T11:00:00.000Z',
    });

    const createRes = await supertest(app)
      .post('/api/google-calendar/events')
      .set(AUTH_HEADER)
      .send({
        title: 'Initial',
        start_time: '2026-04-10T10:00:00.000Z',
        end_time: '2026-04-10T11:00:00.000Z',
      });
    expect(createRes.status).toBe(200);
    expect(createRes.body.data.google_event_id).toBe('gev-1');

    // Update title
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-1',
      google_event_id: 'gev-1',
    });
    mockGoogleCalendarService.updateGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.updateCalendarEvent.mockResolvedValue({
      id: 'local-1',
      google_event_id: 'gev-1',
      title: 'Renamed',
    });

    const updateRes = await supertest(app)
      .put('/api/google-calendar/events/gev-1')
      .set(AUTH_HEADER)
      .send({ title: 'Renamed' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Renamed');

    // Delete
    mockGoogleCalendarService.deleteGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.deleteCalendarEvent.mockResolvedValue(true);

    const deleteRes = await supertest(app)
      .delete('/api/google-calendar/events/gev-1')
      .set(AUTH_HEADER);
    expect(deleteRes.status).toBe(200);

    // Order of ops is preserved
    expect(mockGoogleCalendarService.createGoogleEvent).toHaveBeenCalledTimes(
      1
    );
    expect(mockGoogleCalendarService.updateGoogleEvent).toHaveBeenCalledTimes(
      1
    );
    expect(mockGoogleCalendarService.deleteGoogleEvent).toHaveBeenCalledTimes(
      1
    );
    expect(mockCalendarEventService.deleteCalendarEvent).toHaveBeenCalledWith(
      'local-1',
      'fake-test-token'
    );
  });
});

// ── DELETE /api/google-calendar/events/:googleEventId ───────────────────────
describe('DELETE /api/google-calendar/events/:googleEventId', () => {
  test('deletes event from Google Calendar and locally', async () => {
    mockGoogleCalendarService.deleteGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue({
      id: 'local-evt-1',
      google_event_id: 'google-evt-123',
    });
    mockCalendarEventService.deleteCalendarEvent.mockResolvedValue(true);

    const res = await supertest(app)
      .delete('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockGoogleCalendarService.deleteGoogleEvent).toHaveBeenCalledWith(
      'user-1',
      'google-evt-123'
    );
    expect(
      mockCalendarEventService.getCalendarEventByGoogleEventId
    ).toHaveBeenCalledWith('user-1', 'google-evt-123', 'fake-test-token');
    expect(mockCalendarEventService.deleteCalendarEvent).toHaveBeenCalledWith(
      'local-evt-1',
      'fake-test-token'
    );
  });

  test('succeeds even when local event not found (already deleted)', async () => {
    mockGoogleCalendarService.deleteGoogleEvent.mockResolvedValue(undefined);
    mockCalendarEventService.getCalendarEventByGoogleEventId.mockResolvedValue(
      null
    );

    const res = await supertest(app)
      .delete('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCalendarEventService.deleteCalendarEvent).not.toHaveBeenCalled();
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).delete(
      '/api/google-calendar/events/google-evt-123'
    );
    expect(res.status).toBe(401);
  });

  test('returns 500 when Google API throws', async () => {
    mockGoogleCalendarService.deleteGoogleEvent.mockRejectedValue(
      new Error('Google API delete error')
    );

    const res = await supertest(app)
      .delete('/api/google-calendar/events/google-evt-123')
      .set(AUTH_HEADER);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Google API delete error');
  });
});
