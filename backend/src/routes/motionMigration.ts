/**
 * POST /api/motion-migration
 *
 * Triggers a one-way data import from usemotion.com into Nexto.
 * The caller must be authenticated (Nexto JWT) AND provide their Motion API
 * key in the request body.
 *
 * Request body:
 *   { "motionApiKey": "<key from Motion Settings>" }
 *
 * Response body:
 *   MigrationResult (see motionMigrationService.ts)
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

  const { motionApiKey } = req.body as { motionApiKey?: string };

  if (!motionApiKey || typeof motionApiKey !== 'string') {
    return ResponseHelper.badRequest(
      res,
      'motionApiKey is required in the request body'
    );
  }

  try {
    const migrationService = new MotionMigrationService(motionApiKey);
    const result = await migrationService.migrate(
      authReq.userId,
      authReq.authToken
    );

    ResponseHelper.success(res, result, 'Motion data imported successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Migration failed'
    );
  }
});

export default router;
