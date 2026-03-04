/**
 * POST /api/motion-migration
 *
 * Triggers a one-way data import from usemotion.com into Nexto.
 * The caller must be authenticated (Nexto JWT) AND provide their Motion API
 * key via the X-Motion-Api-Key request header (never in the body — body is
 * logged by access-log middleware).
 *
 * The migration runs synchronously and returns the full MigrationResult.
 *
 * NOTE: This endpoint is not idempotent — re-running it will create duplicate
 * records in the database. To make it truly idempotent in a multi-instance or
 * serverless deployment, a shared distributed lock (e.g. Redis/DB row) or
 * upsert-by-Motion-ID logic would be required.
 */
import express, { type Request, type Response } from 'express';
import { MotionMigrationService } from '../services/motionMigrationService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

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

  try {
    const migrationService = new MotionMigrationService(motionApiKey);
    const result = await migrationService.migrate(userId, authReq.authToken);

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

    return res.status(200).json({
      success: true,
      message: 'Migration completed.',
      result,
    });
  } catch (err) {
    console.error(
      `[motion-migration] user=${userId} fatal error:`,
      err instanceof Error ? err.message : String(err)
    );
    return res.status(500).json({
      success: false,
      message: 'Migration failed due to an internal error.',
    });
  } finally {
    // no-op: formerly tracked in-process lock (removed — not effective in
    // serverless/multi-instance environments)
  }
});

export default router;
