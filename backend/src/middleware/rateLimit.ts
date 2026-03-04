import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * General API rate limiter applied globally to all /api/* routes.
 *
 * Limit: configurable via the RATE_LIMIT environment variable (requests per
 * 15-minute window per IP address); defaults to 1000 when not set.
 *
 * Note: when deployed behind a proxy (e.g. Vercel), set `trust proxy` on the
 * Express app so that `express-rate-limit` sees the real client IP from
 * X-Forwarded-For rather than the proxy IP.
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
