import express, { type Request, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { CalendarEventService } from '../services/calendarEventService.js';
import { AutoScheduleService } from '../services/autoScheduleService.js';
import {
  DayBlockService,
  buildLocalDateTime,
} from '../services/dayBlockService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
router.use(authMiddleware);

const calendarEventService = new CalendarEventService();
const autoScheduleService = new AutoScheduleService();
const dayBlockService = new DayBlockService();

/**
 * POST /api/day-blocks/preview
 *
 * Simulates blocking a day and returns what tasks would be moved, without
 * actually creating the block or running auto-schedule.
 *
 * Request body:
 *   { date: "YYYY-MM-DD", from_time: "HH:MM" }
 *
 * Response:
 *   { tasksToMove, totalEventsCreated, totalEventsDeleted, violations, blockEndTime }
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.userId || !authReq.authToken || !authReq.supabaseClient) {
      return ResponseHelper.unauthorized(res);
    }

    const { date, from_time } = req.body as {
      date?: string;
      from_time?: string;
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ResponseHelper.error(res, 'date is required (YYYY-MM-DD)', 400);
    }
    if (!from_time || !/^\d{2}:\d{2}$/.test(from_time)) {
      return ResponseHelper.error(res, 'from_time is required (HH:MM)', 400);
    }

    // Validate the from_time string can form a real datetime
    const probe = buildLocalDateTime(date, from_time);
    if (isNaN(probe.getTime())) {
      return ResponseHelper.error(
        res,
        'Invalid date/from_time combination',
        400
      );
    }

    const times = await dayBlockService.resolveTimes(
      authReq.userId,
      authReq.authToken,
      date,
      from_time
    );
    if ('error' in times) {
      return ResponseHelper.error(
        res,
        'Working day already over — no block possible',
        400,
        times.error
      );
    }

    const result = await dayBlockService.simulate(
      authReq.supabaseClient,
      authReq.userId,
      authReq.authToken,
      times.startTime,
      times.endTime,
      times.isNonWorkingDay
    );

    ResponseHelper.success(res, result, 'Preview generated successfully');
  } catch (error) {
    console.error('[DayBlocksRoute] Error previewing day block:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

/**
 * POST /api/day-blocks
 *
 * Creates a day-block calendar event from a chosen time to the end of the user's
 * working hours, then immediately re-runs auto-schedule so all remaining task
 * events are pushed past the block.
 *
 * Request body:
 *   { date: "YYYY-MM-DD", from_time: "HH:MM" }
 *
 * Response:
 *   { day_block, schedule_result: { unchanged, eventsCreated, eventsDeleted, violations } }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.userId || !authReq.authToken || !authReq.supabaseClient) {
      return ResponseHelper.unauthorized(res);
    }

    const { date, from_time } = req.body as {
      date?: string;
      from_time?: string;
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ResponseHelper.error(res, 'date is required (YYYY-MM-DD)', 400);
    }
    if (!from_time || !/^\d{2}:\d{2}$/.test(from_time)) {
      return ResponseHelper.error(res, 'from_time is required (HH:MM)', 400);
    }

    const probe = buildLocalDateTime(date, from_time);
    if (isNaN(probe.getTime())) {
      return ResponseHelper.error(
        res,
        'Invalid date/from_time combination',
        400
      );
    }

    const times = await dayBlockService.resolveTimes(
      authReq.userId,
      authReq.authToken,
      date,
      from_time
    );
    if ('error' in times) {
      return ResponseHelper.error(
        res,
        'Working day already over — no block created',
        400,
        times.error
      );
    }

    // Reject if an overlapping day block already exists
    const existing = await dayBlockService.findOverlappingDayBlock(
      authReq.authToken,
      times.startTime,
      times.endTime
    );
    if (existing) {
      return ResponseHelper.error(
        res,
        'A day block already exists for this window',
        409,
        'Delete the existing block before creating a new one'
      );
    }

    const { dayBlock, scheduleResult } = await dayBlockService.create(
      authReq.userId,
      authReq.authToken,
      times.startTime,
      times.endTime
    );

    ResponseHelper.success(
      res,
      { day_block: dayBlock, schedule_result: scheduleResult },
      'Day blocked and tasks rescheduled'
    );
  } catch (error) {
    console.error('[DayBlocksRoute] Error creating day block:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

/**
 * DELETE /api/day-blocks/:id
 *
 * Deletes a day-block event and re-runs auto-schedule so tasks reclaim
 * the freed window.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.userId || !authReq.authToken) {
      return ResponseHelper.unauthorized(res);
    }

    const id = Array.isArray(req.params['id'])
      ? req.params['id'][0]
      : req.params['id'];

    if (!id) {
      return ResponseHelper.error(res, 'Missing day block id', 400);
    }

    // Fetch the event first to verify it's actually a day block.
    // The authenticated client enforces RLS ownership automatically.
    const event = await calendarEventService.getCalendarEventById(
      id,
      authReq.authToken
    );
    if (!event) {
      return ResponseHelper.notFound(res, 'Day block not found');
    }
    if (!(event as { is_day_block?: boolean }).is_day_block) {
      return ResponseHelper.error(res, 'Event is not a day block', 400);
    }

    await calendarEventService.deleteCalendarEvent(id, authReq.authToken);

    const scheduleResult = await autoScheduleService.run(
      authReq.userId,
      authReq.authToken
    );

    ResponseHelper.success(
      res,
      { schedule_result: scheduleResult },
      'Day block removed and tasks rescheduled'
    );
  } catch (error) {
    console.error('[DayBlocksRoute] Error deleting day block:', error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
