import express, { type Request, type Response } from 'express';
import { AutoScheduleService } from '../services/autoScheduleService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const autoScheduleService = new AutoScheduleService();

router.use(authMiddleware);

/**
 * POST /api/auto-schedule/run
 *
 * Runs the full auto-schedule computation for the authenticated user:
 *  - Fetches tasks, calendar events, and schedules from the database
 *  - Computes the optimal task schedule
 *  - Creates missing calendar events and deletes stale ones
 *
 * Response body (on success):
 *  {
 *    unchanged: boolean,       // true when the schedule was already optimal
 *    eventsCreated: number,
 *    eventsDeleted: number,
 *    violations: number        // number of deadline/overlap violations detected
 *  }
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.userId || !authReq.authToken) {
      return ResponseHelper.unauthorized(res);
    }

    const result = await autoScheduleService.run(
      authReq.userId,
      authReq.authToken
    );

    ResponseHelper.success(res, result, 'Auto-schedule run completed');
  } catch (error) {
    console.error('[AutoScheduleRoute] Error running auto-schedule:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

/**
 * GET /api/auto-schedule/pinned-preview
 *
 * Returns the list of manually-pinned tasks whose calendar events would be
 * moved or deleted if auto-schedule ran right now (i.e. tasks that have
 * pinned events that conflict with the proposed schedule).
 *
 * Response body (on success):
 *  {
 *    pinnedTasks: Array<{ id: string; title: string }>
 *  }
 */
router.get('/pinned-preview', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.userId || !authReq.authToken || !authReq.supabaseClient) {
      return ResponseHelper.unauthorized(res);
    }

    const pinnedTasks = await autoScheduleService.getPinnedTasksAffectedByRun(
      authReq.userId,
      authReq.supabaseClient,
      authReq.authToken
    );

    ResponseHelper.success(res, { pinnedTasks }, 'Pinned preview computed');
  } catch (error) {
    console.error('[AutoScheduleRoute] Error computing pinned preview:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
