import express, { type Request, type Response } from 'express';
import { CalendarEventService } from '../services/calendarEventService.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
const calendarEventService = new CalendarEventService();

// GET /api/calendar-events - Get all calendar events
router.get('/', async (req: Request, res: Response) => {
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
        end_date
      );
    } else if (task_id && typeof task_id === 'string') {
      console.log('[CalendarEventsRoute] Fetching events by task_id');
      events = await calendarEventService.getCalendarEventsByTaskId(task_id);
    } else {
      console.log('[CalendarEventsRoute] Fetching all events');
      events = await calendarEventService.getAllCalendarEvents();
    }

    console.log('[CalendarEventsRoute] Returning events:', {
      count: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: e.linked_task_id,
      })),
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Calendar event ID is required');
    }
    const event = await calendarEventService.getCalendarEventById(id);

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
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('[CalendarEventsRoute] POST /api/calendar-events called');
    console.log('[CalendarEventsRoute] Request body:', req.body);
    const input: CreateCalendarEventInput = req.body;
    const event = await calendarEventService.createCalendarEvent(input);
    console.log('[CalendarEventsRoute] Calendar event created:', event);
    ResponseHelper.created(res, event, 'Calendar event created successfully');
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
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Calendar event ID is required');
    }
    const input: UpdateCalendarEventInput = req.body;
    const event = await calendarEventService.updateCalendarEvent(id, input);
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

// DELETE /api/calendar-events/:id - Delete calendar event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Calendar event ID is required');
    }
    await calendarEventService.deleteCalendarEvent(id);
    ResponseHelper.deleted(res, 'Calendar event deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
