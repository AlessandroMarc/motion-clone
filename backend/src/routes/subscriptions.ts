import express, { type Request, type Response } from 'express';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { isValidEmail } from '../utils/email.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  return req.ip || 'unknown';
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const emailInput = (req.body?.email || '').toString().trim().toLowerCase();

    if (!emailInput || !isValidEmail(emailInput)) {
      return ResponseHelper.validationError(res, 'Invalid email address');
    }

    const key = getClientKey(req);
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return ResponseHelper.error(
          res,
          'Too many requests',
          429,
          'Please try again later.'
        );
      }
      entry.count += 1;
    } else {
      rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const { error } = await supabase
      .from('subscriptions')
      .insert({ email: emailInput });

    if (error) {
      return ResponseHelper.badRequest(res, error.message);
    }

    // Ping Slack (Lead Magnet Notification)
    try {
      const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
      if (SLACK_WEBHOOK_URL) {
        await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚀 *New lead joined the waitlist!*\n📧 Email: ${emailInput}\n📅 Date: ${new Date().toLocaleString()}`,
          }),
        });
      }
    } catch (slackError) {
      // We don't want to fail the subscription if Slack notification fails
      console.error(
        '[Subscriptions] Failed to send Slack notification:',
        slackError
      );
    }

    return ResponseHelper.created(
      res,
      { email: emailInput },
      'Subscription created'
    );
  } catch (error) {
    return ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
