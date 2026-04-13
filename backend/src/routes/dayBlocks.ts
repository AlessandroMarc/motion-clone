import express, { type Request, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { CalendarEventService } from '../services/calendarEventService.js';
import { UserSettingsService } from '../services/userSettingsService.js';
import { AutoScheduleService } from '../services/autoScheduleService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
router.use(authMiddleware);

const calendarEventService = new CalendarEventService();
const userSettingsService = new UserSettingsService();
const autoScheduleService = new AutoScheduleService();

/**
 * Floor to the current 15-minute slot.
 * e.g. 14:03 → "14:00", 14:15 → "14:15", 14:47 → "14:45"
 */
function floorTo15(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes() - (date.getMinutes() % 15)).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * POST /api/day-blocks
 *
 * Creates a day-block calendar event from a chosen time to the end of the user's
 * working hours, then immediately re-runs auto-schedule so all remaining task
 * events are pushed past the block.
 *
 * Request body:
 *   { date: "YYYY-MM-DD", from_time?: "HH:MM" }
 *   from_time defaults to current local time rounded to the next 15 minutes.
 *
 * Response:
 *   { day_block: CalendarEvent, schedule_result: { unchanged, eventsCreated, eventsDeleted, violations } }
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

    // Resolve from_time — default to current time floored to current 15-min slot
    const fromTime = from_time ?? floorTo15(new Date());
    if (!/^\d{2}:\d{2}$/.test(fromTime)) {
      return ResponseHelper.error(res, 'from_time must be HH:MM', 400);
    }

    // Build start_time as local datetime string
    const startTime = new Date(`${date}T${fromTime}:00`);
    if (isNaN(startTime.getTime())) {
      return ResponseHelper.error(res, 'Invalid date/from_time combination', 400);
    }

    // Fetch active schedule to determine working hours end for this day
    const schedule = await userSettingsService.getActiveSchedule(
      authReq.userId,
      authReq.authToken
    );

    const dayOfWeek = startTime.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySchedule = schedule?.working_days?.[dayOfWeek];

    // daySchedule can be null (non-working day) or undefined (no per-day config) —
    // fall back to working_hours_end so the user can block any day they like
    const workingEnd =
      (daySchedule != null ? daySchedule.end : undefined) ??
      schedule?.working_hours_end ??
      18;
    const endTime = new Date(`${date}T${String(workingEnd).padStart(2, '0')}:00:00`);

    if (startTime >= endTime) {
      return ResponseHelper.error(
        res,
        'Working day already over — no block created',
        400,
        'The chosen time is at or after the end of your working hours'
      );
    }

    // Create the day-block event
    const dayBlock = await calendarEventService.createCalendarEvent(
      {
        title: 'Day blocked',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        user_id: authReq.userId,
        is_day_block: true,
      },
      undefined,
      authReq.authToken
    );

    // Re-run auto-schedule so tasks are pushed past the block
    const scheduleResult = await autoScheduleService.run(
      authReq.userId,
      authReq.authToken
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
