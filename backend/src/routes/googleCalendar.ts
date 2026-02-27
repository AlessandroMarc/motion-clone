import express, { type Request, type Response } from 'express';
import { GoogleCalendarService } from '../services/googleCalendarService.js';
import { getFrontendUrl } from '../config/env.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const googleCalendarService = new GoogleCalendarService();

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
    const userId = req.body?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const result = await googleCalendarService.syncEventsFromGoogle(userId);

    if (result.success) {
      ResponseHelper.success(
        res,
        {
          synced: result.synced,
          errors: result.errors,
        },
        `Successfully synced ${result.synced} events`
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
});

export default router;
