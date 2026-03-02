/**
 * POST /api/motion-migration
 *
 * Triggers a one-way data import from usemotion.com into Nexto.
 * The caller must be authenticated (Nexto JWT) AND provide their Motion API
 * key via the X-Motion-Api-Key request header (never in the body — body is
 * logged by access-log middleware).
 *
 * Response: 202 Accepted — migration runs asynchronously in the background.
 * Check server logs for the per-workspace result summary.
 *
 * To prevent duplicate imports, a second call while a migration is already
 * running for the same user will be rejected with 409 Conflict.
 * Pass the header `X-Migration-Force: true` to skip this check.
 */
import express, { type Request, type Response } from 'express';
import { MotionMigrationService } from '../services/motionMigrationService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * In-memory set of user IDs that currently have a migration in progress.
 * Guards against accidental double-submissions while the async job is running.
 */
const migrationsInProgress = new Set<string>();

// All endpoints require a valid Nexto JWT
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId;

  // API key must come from a header, not the body (bodies are logged)
  const motionApiKey = req.headers['x-motion-api-key'];
  if (!motionApiKey || typeof motionApiKey !== 'string') {
    return ResponseHelper.badRequest(
      res,
      'X-Motion-Api-Key header is required'
    );
  }

  // Concurrency guard: reject if a migration is already running for this user
  const force = req.headers['x-migration-force'] === 'true';
  if (!force && migrationsInProgress.has(userId)) {
    return res.status(409).json({
      success: false,
      message: 'A migration is already in progress for this account. ' +
        'Add the X-Migration-Force: true header to run a new one anyway.',
    });
  }

  // Respond immediately — the migration runs async in the background
  res.status(202).json({
    success: true,
    message: 'Migration started. Results will be logged server-side.',
  });

  migrationsInProgress.add(userId);

  const migrationService = new MotionMigrationService(motionApiKey);
  migrationService
    .migrate(userId, authReq.authToken)
    .then(result => {
      console.log(
        `[motion-migration] user=${userId} ` +
        `projects=${result.totalProjectsImported} ` +
        `tasks=${result.totalTasksImported} ` +
        `recurring=${result.totalRecurringTasksImported}`
      );
      const totalErrors = result.workspaces.reduce((n, w) => n + w.errors.length, 0);
      if (totalErrors > 0) {
        console.warn(`[motion-migration] user=${userId} completed with ${totalErrors} error(s):`);
        result.workspaces.forEach(w =>
          w.errors.forEach(e => console.warn(`  [${w.motionWorkspaceName}] ${e}`))
        );
      }
    })
    .catch(err => {
      console.error(
        `[motion-migration] user=${userId} fatal error:`,
        err instanceof Error ? err.message : String(err)
      );
    })
    .finally(() => {
      migrationsInProgress.delete(userId);
    });
});

export default router;
