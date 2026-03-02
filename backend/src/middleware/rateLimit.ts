import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Configurable via environment variables so staging/production can be tuned
// without a code change. Defaults: 200 requests per 15-minute window.
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '', 10) || 15 * 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '', 10) || 200;

/**
 * The 429 response handler. Exported separately so tests can reuse it
 * when building a tight-limit limiter rather than duplicating the response shape.
 */
export function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the request rate limit. Please try again later.',
  });
}

/** General API rate limiter applied globally to all /api/* routes. */
export const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
