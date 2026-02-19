import express, { type Response } from 'express';
import { CalendarEventService } from '../services/calendarEventService.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const calendarEventService = new CalendarEventService();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/calendar-events - Get all calendar events
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[CalendarEventsRoute] GET /api/calendar-events called');
    console.log('[CalendarEventsRoute] Query params:', req.query);
    const { start_date, end_date, task_id } = req.query;

    let events;
    if (
      start_date &&
      end_date &&
      typeof start_date === 'string' &&
      typeof end_date === 'string'
    ) {
      console.log('[CalendarEventsRoute] Fetching events by date range');
      events = await calendarEventService.getCalendarEventsByDateRange(
        start_date,
        end_date,
        req.authToken
      );
    } else if (task_id && typeof task_id === 'string') {
      console.log('[CalendarEventsRoute] Fetching events by task_id');
      events = await calendarEventService.getCalendarEventsByTaskId(
        task_id,
        req.authToken
      );
    } else {
      console.log('[CalendarEventsRoute] Fetching all events');
      events = await calendarEventService.getAllCalendarEvents(req.authToken);
    }

    console.log('[CalendarEventsRoute] Returning events:', {
      count: events.length,
    });

    ResponseHelper.list(
      res,
      events,
      'Calendar events retrieved successfully',
      events.length
    );
  } catch (error) {
    console.error(
      '[CalendarEventsRoute] Error fetching calendar events:',
      error
    );
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/calendar-events/:id - Get calendar event by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Calendar event ID is required and must be a string'
      );
    }
    const event = await calendarEventService.getCalendarEventById(
      id,
      req.authToken
    );

    if (!event) {
      return ResponseHelper.notFound(res, 'Calendar event');
    }

    ResponseHelper.single(res, event, 'Calendar event retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/calendar-events - Create new calendar event
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[CalendarEventsRoute] POST /api/calendar-events called');
    console.log('[CalendarEventsRoute] Request body:', req.body);

    // Check if this is a batch request
    if (Array.isArray(req.body)) {
      const inputs: CreateCalendarEventInput[] = req.body;

      // Ensure all events belong to the authenticated user to satisfy RLS
      inputs.forEach(input => {
        input.user_id = authReq.userId;
      });

      const results = await calendarEventService.createCalendarEventsBatch(
        inputs,
        req.authToken
      );

      // Return results with success/failure for each event
      ResponseHelper.success(
        res,
        {
          results,
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
        'Batch calendar events creation completed'
      );
    } else {
      // Single event creation
      const input: CreateCalendarEventInput = req.body;
      const event = await calendarEventService.createCalendarEvent(
        input,
        undefined,
        req.authToken
      );
      console.log('[CalendarEventsRoute] Calendar event created:', event);
      ResponseHelper.created(res, event, 'Calendar event created successfully');
    }
  } catch (error) {
    console.error(
      '[CalendarEventsRoute] Error creating calendar event:',
      error
    );
    const message =
      error instanceof Error && error.message.includes('overlaps')
        ? 'Calendar event overlaps with an existing event'
        : error instanceof Error
          ? error.message
          : 'Bad request';
    ResponseHelper.badRequest(res, message);
  }
});

// PUT /api/calendar-events/:id - Update calendar event
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Calendar event ID is required and must be a string'
      );
    }
    const input: UpdateCalendarEventInput = req.body;
    const event = await calendarEventService.updateCalendarEvent(
      id,
      input,
      req.authToken
    );
    ResponseHelper.updated(res, event, 'Calendar event updated successfully');
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('overlaps')
        ? 'Calendar event overlaps with an existing event'
        : error instanceof Error
          ? error.message
          : 'Bad request';
    ResponseHelper.badRequest(res, message);
  }
});

// DELETE /api/calendar-events/batch - Batch delete calendar events
router.delete('/batch', async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ResponseHelper.badRequest(
        res,
        'Array of event IDs is required for batch delete'
      );
    }

    // Validate all IDs are strings
    if (!ids.every(id => typeof id === 'string')) {
      return ResponseHelper.badRequest(res, 'All event IDs must be strings');
    }

    const results = await calendarEventService.deleteCalendarEventsBatch(
      ids,
      req.authToken
    );

    ResponseHelper.success(
      res,
      {
        results,
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
      'Batch calendar events deletion completed'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// DELETE /api/calendar-events/:id - Delete calendar event
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Calendar event ID is required and must be a string'
      );
    }
    await calendarEventService.deleteCalendarEvent(id, req.authToken);
    ResponseHelper.deleted(res, 'Calendar event deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
