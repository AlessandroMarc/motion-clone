import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * General API rate limiter applied globally to all /api/* routes.
 *
 * Limits: up to RATE_LIMIT (env) requests per 15-minute window per IP address,
 * defaulting to 1000.
 */
const rawRateLimit = process.env.RATE_LIMIT
  ? parseInt(process.env.RATE_LIMIT, 10)
  : NaN;
const resolvedRateLimit =
  Number.isFinite(rawRateLimit) && rawRateLimit > 0 ? rawRateLimit : 1000;

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: resolvedRateLimit,
  standardHeaders: 'draft-7', // Return RateLimit header (draft-7 RateLimit header specification)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message:
        'You have exceeded the request rate limit. Please try again later.',
    });
  },
});
