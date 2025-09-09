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
    const { start_date, end_date, task_id, project_id } = req.query;

    let events;
    if (
      start_date &&
      end_date &&
      typeof start_date === 'string' &&
      typeof end_date === 'string'
    ) {
      events = await calendarEventService.getCalendarEventsByDateRange(
        start_date,
        end_date
      );
    } else if (task_id && typeof task_id === 'string') {
      events = await calendarEventService.getCalendarEventsByTaskId(task_id);
    } else if (project_id && typeof project_id === 'string') {
      events =
        await calendarEventService.getCalendarEventsByProjectId(project_id);
    } else {
      events = await calendarEventService.getAllCalendarEvents();
    }

    ResponseHelper.list(
      res,
      events,
      'Calendar events retrieved successfully',
      events.length
    );
  } catch (error) {
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
    const input: CreateCalendarEventInput = req.body;
    const event = await calendarEventService.createCalendarEvent(input);
    ResponseHelper.created(res, event, 'Calendar event created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
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
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
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
