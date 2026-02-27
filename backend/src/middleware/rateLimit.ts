import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * General API rate limiter applied globally to all /api/* routes.
 *
 * Limits: 200 requests per 15-minute window per IP address.
 * This prevents abuse across all endpoints (tasks, projects, milestones,
 * calendarEvents, googleCalendar, userSettings, subscriptions, health).
 *
 * The limit is intentionally generous for legitimate clients while still
 * protecting against automated scraping or brute-force attempts.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,
  standardHeaders: 'draft-7', // Return RateLimit header (draft-7 RateLimit header specification)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'You have exceeded the request rate limit. Please try again later.',
    });
  },
});
