import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Express } from 'express';

// ── dynamic imports ───────────────────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: rateLimit } = await import('express-rate-limit');
const { apiRateLimiter, rateLimitHandler } = await import('../rateLimit.js');

// Build a minimal app that uses the actual rate limiter + a simple route
const app: Express = express();
app.use(express.json());
app.use('/api', apiRateLimiter);
app.get('/api/test', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

// A separate app using the real rateLimitHandler but with a limit of 1 so the
// 429 path can be triggered without sending 200 real requests.
const tightApp: Express = express();
tightApp.use(express.json());
tightApp.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 1,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler, // reuse the actual exported handler — not a copy
  })
);
tightApp.get('/api/test', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('apiRateLimiter', () => {
  test('allows requests within the limit', async () => {
    const res = await supertest(app).get('/api/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns standard RateLimit headers', async () => {
    const res = await supertest(app).get('/api/test');
    // draft-7 standard header: a single combined RateLimit header
    expect(res.headers['ratelimit']).toBeDefined();
  });

  test('returns 429 and structured JSON error after limit is exceeded', async () => {
    // First request: should succeed
    const first = await supertest(tightApp).get('/api/test');
    expect(first.status).toBe(200);

    // Second request: triggers the real rateLimitHandler
    const second = await supertest(tightApp).get('/api/test');
    expect(second.status).toBe(429);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe('Too many requests');
    expect(second.body.message).toContain('rate limit');
  });
});
