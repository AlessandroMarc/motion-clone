import express, { type Request, type Response } from 'express';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  return req.ip || 'unknown';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    // Ping Telegram (Lead Magnet Notification)
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: `🚀 *New lead joined the waitlist!*\n📧 Email: ${emailInput}\n📅 Date: ${new Date().toLocaleString()}`,
              parse_mode: 'Markdown',
            }),
          }
        );
      }
    } catch (telegramError) {
      // We don't want to fail the subscription if Telegram notification fails
      console.error(
        '[Subscriptions] Failed to send Telegram notification:',
        telegramError
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
