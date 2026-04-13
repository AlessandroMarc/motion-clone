import express, { type Request, type Response } from 'express';
import { GoogleCalendarService } from '../services/googleCalendarService.js';
import { CalendarEventService } from '../services/calendarEventService.js';
import { getFrontendUrl } from '../config/env.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { UpdateCalendarEventInput } from '../types/database.js';

/** Validate that a string is a parseable date and return the Date, or null. */
function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const router = express.Router();
const googleCalendarService = new GoogleCalendarService();
const calendarEventService = new CalendarEventService();

function getFrontendBaseUrlOrFail(res: Response): string | null {
  try {
    return getFrontendUrl();
  } catch (e) {
    console.error('[GoogleCalendarRoute] FRONTEND_URL is not configured:', e);
    ResponseHelper.internalError(
      res,
      e instanceof Error ? e.message : 'Missing FRONTEND_URL'
    );
    return null;
  }
}

// GET /api/google-calendar/auth - Initiate OAuth flow
router.get('/auth', async (req: Request, res: Response) => {
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const authUrl = googleCalendarService.initiateOAuth(userId);
    res.redirect(authUrl);
  } catch (error) {
    console.error('[GoogleCalendarRoute] Auth initiation error:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/google-calendar/callback - OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    const frontendUrl = getFrontendBaseUrlOrFail(res);
    if (!frontendUrl) return;

    if (error) {
      console.error('[GoogleCalendarRoute] OAuth error:', error);
      return res.redirect(
        `${frontendUrl}/profile?google_calendar_error=${encodeURIComponent(error as string)}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/profile?google_calendar_error=missing_code_or_state`
      );
    }

    const userId = state as string;
    const result = await googleCalendarService.handleOAuthCallback(
      code as string,
      userId
    );

    if (result.success) {
      return res.redirect(
        `${frontendUrl}/profile?google_calendar_connected=true`
      );
    } else {
      return res.redirect(
        `${frontendUrl}/profile?google_calendar_error=${encodeURIComponent(result.error || 'unknown_error')}`
      );
    }
  } catch (error) {
    console.error('[GoogleCalendarRoute] Callback error:', error);
    const frontendUrl = (() => {
      try {
        return getFrontendUrl();
      } catch {
        return null;
      }
    })();

    if (frontendUrl) {
      return res.redirect(
        `${frontendUrl}/profile?google_calendar_error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
      );
    }

    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'unknown_error'
    );
  }
});

// GET /api/google-calendar/status - Get connection status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const status = await googleCalendarService.getConnectionStatus(userId);
    ResponseHelper.success(
      res,
      status,
      'Connection status retrieved successfully'
    );
  } catch (error) {
    console.error('[GoogleCalendarRoute] Status error:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/google-calendar/sync - Manual sync
router.post('/sync', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = req.body?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const result = await googleCalendarService.syncEventsFromGoogle(
      userId,
      authReq.authToken
    );

    if (result.success) {
      ResponseHelper.success(
        res,
        {
          synced: result.synced,
          errors: result.errors,
          durationMs: result.durationMs,
          filtered: result.filtered,
        },
        `Successfully synced ${result.synced} events in ${result.durationMs}ms`
      );
    } else if (
      Array.isArray(result.errors) &&
      result.errors[0] === 'google_calendar_invalid_grant'
    ) {
      ResponseHelper.error(
        res,
        result.errors[1] ||
          'Google Calendar authorization expired. Please reconnect.',
        401,
        'Google Calendar authorization expired. Please reconnect.'
      );
    } else {
      ResponseHelper.internalError(
        res,
        result.errors.join(', ') || 'Sync failed'
      );
    }
  } catch (error) {
    console.error('[GoogleCalendarRoute] Sync error:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// DELETE /api/google-calendar/disconnect - Disconnect Google Calendar
router.delete(
  '/disconnect',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.body?.user_id as string;

      if (!userId) {
        return ResponseHelper.badRequest(res, 'User ID is required');
      }

      await googleCalendarService.disconnectGoogleCalendar(userId);
      ResponseHelper.success(
        res,
        null,
        'Google Calendar disconnected successfully'
      );
    } catch (error) {
      console.error('[GoogleCalendarRoute] Disconnect error:', error);
      ResponseHelper.internalError(
        res,
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  }
);

// POST /api/google-calendar/events - Create event on Google Calendar + local DB
router.post('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { title, description, start_time, end_time } = req.body;

    if (!title || !start_time || !end_time) {
      return ResponseHelper.badRequest(
        res,
        'title, start_time, and end_time are required'
      );
    }

    const parsedStart = parseTimestamp(start_time);
    const parsedEnd = parseTimestamp(end_time);
    if (!parsedStart || !parsedEnd) {
      return ResponseHelper.badRequest(res, 'start_time and end_time must be valid timestamps');
    }
    if (parsedEnd <= parsedStart) {
      return ResponseHelper.badRequest(res, 'end_time must be after start_time');
    }

    // Create on Google Calendar first
    const googleEventId = await googleCalendarService.createGoogleEvent(
      authReq.userId,
      { title, description, start_time, end_time }
    );

    // Create locally with synced_from_google flag
    const localEvent = await calendarEventService.createCalendarEvent(
      {
        title,
        description,
        start_time,
        end_time,
        user_id: authReq.userId,
        google_event_id: googleEventId,
        synced_from_google: true,
      },
      undefined,
      authReq.authToken
    );

    ResponseHelper.success(res, localEvent, 'Google Calendar event created');
  } catch (error) {
    console.error('[GoogleCalendarRoute] Create event error:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Failed to create event'
    );
  }
});

// PUT /api/google-calendar/events/:googleEventId - Update event on Google + local DB
router.put(
  '/events/:googleEventId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const googleEventId = req.params.googleEventId as string;
      const { title, description, start_time, end_time } = req.body;

      // Validate timestamps when provided
      if (start_time !== undefined || end_time !== undefined) {
        const parsedStart = start_time !== undefined ? parseTimestamp(start_time) : null;
        const parsedEnd = end_time !== undefined ? parseTimestamp(end_time) : null;
        if ((start_time !== undefined && !parsedStart) || (end_time !== undefined && !parsedEnd)) {
          return ResponseHelper.badRequest(res, 'start_time and end_time must be valid timestamps');
        }
        if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
          return ResponseHelper.badRequest(res, 'end_time must be after start_time');
        }
      }

      // Verify local event exists before modifying Google
      const localEvent =
        await calendarEventService.getCalendarEventByGoogleEventId(
          authReq.userId,
          googleEventId,
          authReq.authToken
        );

      if (!localEvent) {
        return ResponseHelper.notFound(res, 'Local calendar event not found');
      }

      // Validate effective time range (partial updates against stored values)
      if ((start_time !== undefined || end_time !== undefined) && !(start_time !== undefined && end_time !== undefined)) {
        const effectiveStart = start_time !== undefined
          ? new Date(start_time)
          : new Date(localEvent.start_time);
        const effectiveEnd = end_time !== undefined
          ? new Date(end_time)
          : new Date(localEvent.end_time);
        if (effectiveEnd <= effectiveStart) {
          return ResponseHelper.badRequest(res, 'end_time must be after start_time');
        }
      }

      // Update on Google Calendar
      await googleCalendarService.updateGoogleEvent(
        authReq.userId,
        googleEventId,
        { title, description, start_time, end_time }
      );

      const input: UpdateCalendarEventInput = {};
      if (title !== undefined) input.title = title;
      if (description !== undefined) input.description = description;
      if (start_time !== undefined) input.start_time = start_time;
      if (end_time !== undefined) input.end_time = end_time;

      const updated = await calendarEventService.updateCalendarEvent(
        localEvent.id,
        input,
        authReq.authToken
      );

      ResponseHelper.success(res, updated, 'Google Calendar event updated');
    } catch (error) {
      console.error('[GoogleCalendarRoute] Update event error:', error);
      ResponseHelper.internalError(
        res,
        error instanceof Error ? error.message : 'Failed to update event'
      );
    }
  }
);

// DELETE /api/google-calendar/events/:googleEventId - Delete event from Google + local DB
router.delete(
  '/events/:googleEventId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const googleEventId = req.params.googleEventId as string;

      // Delete from Google Calendar
      await googleCalendarService.deleteGoogleEvent(
        authReq.userId,
        googleEventId
      );

      // Find and delete local event
      const localEvent =
        await calendarEventService.getCalendarEventByGoogleEventId(
          authReq.userId,
          googleEventId,
          authReq.authToken
        );

      if (localEvent) {
        await calendarEventService.deleteCalendarEvent(localEvent.id, authReq.authToken);
      }

      ResponseHelper.success(res, null, 'Google Calendar event deleted');
    } catch (error) {
      console.error('[GoogleCalendarRoute] Delete event error:', error);
      ResponseHelper.internalError(
        res,
        error instanceof Error ? error.message : 'Failed to delete event'
      );
    }
  }
);

export default router;
