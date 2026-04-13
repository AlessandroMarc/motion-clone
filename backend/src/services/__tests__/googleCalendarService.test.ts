import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── Mock modules BEFORE dynamic import ───────────────────────────────────────

const mockInsert = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

const mockCalendar = {
  events: {
    insert: mockInsert,
    patch: mockPatch,
    delete: mockDelete,
  },
};

jest.unstable_mockModule('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    calendar: jest.fn().mockReturnValue(mockCalendar),
  },
}));

const mockServiceRoleSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            access_token: 'valid-access-token',
            refresh_token: 'valid-refresh-token',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            calendar_id: 'primary',
          },
          error: null,
        }),
      }),
    }),
  }),
};

jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: {},
  serviceRoleSupabase: mockServiceRoleSupabase,
  getAuthenticatedSupabase: jest.fn().mockReturnValue({}),
}));

jest.unstable_mockModule('../../config/env.js', () => ({
  getGoogleOAuthEnv: jest.fn().mockReturnValue({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3003/api/google-calendar/callback',
  }),
  getFrontendUrl: jest.fn().mockReturnValue('http://localhost:3000'),
}));

jest.unstable_mockModule('../../config/loadEnv.js', () => ({
  loadEnv: jest.fn(),
}));

jest.unstable_mockModule('../calendarEventService.js', () => ({
  CalendarEventService: jest.fn().mockImplementation(() => ({})),
}));

jest.unstable_mockModule('../autoScheduleTriggerQueue.js', () => ({
  autoScheduleTriggerQueue: { trigger: jest.fn() },
}));

// ── Dynamic import after mocks ──────────────────────────────────────────────
const { GoogleCalendarService } = await import('../googleCalendarService.js');

// ── Tests ───────────────────────────────────────────────────────────────────
describe('GoogleCalendarService — CRUD methods', () => {
  let service: InstanceType<typeof GoogleCalendarService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleCalendarService();
  });

  // ── createGoogleEvent ─────────────────────────────────────────────────────
  describe('createGoogleEvent', () => {
    test('creates event and returns Google event ID', async () => {
      mockInsert.mockResolvedValue({
        data: { id: 'google-evt-abc' },
      });

      const result = await service.createGoogleEvent('user-1', {
        title: 'Team standup',
        description: 'Daily sync',
        start_time: '2026-04-10T09:00:00.000Z',
        end_time: '2026-04-10T09:30:00.000Z',
      });

      expect(result).toBe('google-evt-abc');
      expect(mockInsert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: {
          summary: 'Team standup',
          description: 'Daily sync',
          start: { dateTime: '2026-04-10T09:00:00.000Z' },
          end: { dateTime: '2026-04-10T09:30:00.000Z' },
        },
      });
    });

    test('creates event with null description when not provided', async () => {
      mockInsert.mockResolvedValue({
        data: { id: 'google-evt-xyz' },
      });

      await service.createGoogleEvent('user-1', {
        title: 'No-desc event',
        start_time: '2026-04-10T10:00:00.000Z',
        end_time: '2026-04-10T11:00:00.000Z',
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.requestBody.description).toBeNull();
    });

    test('throws when Google does not return an event ID', async () => {
      mockInsert.mockResolvedValue({ data: {} });

      await expect(
        service.createGoogleEvent('user-1', {
          title: 'Bad event',
          start_time: '2026-04-10T10:00:00.000Z',
          end_time: '2026-04-10T11:00:00.000Z',
        })
      ).rejects.toThrow('Google Calendar did not return an event ID');
    });

    test('throws when Google API call fails', async () => {
      mockInsert.mockRejectedValue(new Error('API quota exceeded'));

      await expect(
        service.createGoogleEvent('user-1', {
          title: 'Event',
          start_time: '2026-04-10T10:00:00.000Z',
          end_time: '2026-04-10T11:00:00.000Z',
        })
      ).rejects.toThrow('API quota exceeded');
    });
  });

  // ── updateGoogleEvent ─────────────────────────────────────────────────────
  describe('updateGoogleEvent', () => {
    test('updates event with all fields', async () => {
      mockPatch.mockResolvedValue({ data: {} });

      await service.updateGoogleEvent('user-1', 'google-evt-123', {
        title: 'Updated title',
        description: 'Updated desc',
        start_time: '2026-04-10T14:00:00.000Z',
        end_time: '2026-04-10T15:00:00.000Z',
      });

      expect(mockPatch).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'google-evt-123',
        requestBody: {
          summary: 'Updated title',
          description: 'Updated desc',
          start: { dateTime: '2026-04-10T14:00:00.000Z' },
          end: { dateTime: '2026-04-10T15:00:00.000Z' },
        },
      });
    });

    test('only sends provided fields', async () => {
      mockPatch.mockResolvedValue({ data: {} });

      await service.updateGoogleEvent('user-1', 'google-evt-123', {
        title: 'Only title',
      });

      const patchCall = mockPatch.mock.calls[0][0];
      expect(patchCall.requestBody).toEqual({ summary: 'Only title' });
      expect(patchCall.requestBody.start).toBeUndefined();
      expect(patchCall.requestBody.end).toBeUndefined();
      expect(patchCall.requestBody.description).toBeUndefined();
    });

    test('throws when Google API fails', async () => {
      mockPatch.mockRejectedValue(new Error('Not found'));

      await expect(
        service.updateGoogleEvent('user-1', 'google-evt-123', {
          title: 'Test',
        })
      ).rejects.toThrow('Not found');
    });
  });

  // ── deleteGoogleEvent ─────────────────────────────────────────────────────
  describe('deleteGoogleEvent', () => {
    test('deletes event from Google Calendar', async () => {
      mockDelete.mockResolvedValue({ data: {} });

      await service.deleteGoogleEvent('user-1', 'google-evt-456');

      expect(mockDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'google-evt-456',
      });
    });

    test('throws when Google API fails', async () => {
      mockDelete.mockRejectedValue(new Error('Already deleted'));

      await expect(
        service.deleteGoogleEvent('user-1', 'google-evt-456')
      ).rejects.toThrow('Already deleted');
    });
  });
});
