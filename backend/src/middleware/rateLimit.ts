import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * General API rate limiter applied globally to all /api/* routes.
 *
 * Limits: 1000 requests per 15-minute window per IP address.
 * This is calibrated for a single-user productivity app where the auto-scheduler
 * can fire multiple requests per cycle (tasks fetch, events fetch, batch
 * create/delete, events refresh). 200 was hit too easily during normal testing.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000,
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
