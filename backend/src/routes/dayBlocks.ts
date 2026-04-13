import express, { type Request, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { CalendarEventService } from '../services/calendarEventService.js';
import { UserSettingsService } from '../services/userSettingsService.js';
import { AutoScheduleService } from '../services/autoScheduleService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { isCalendarEventTask } from '../types/database.js';
import type { CalendarEventTask, CalendarEventUnion, Task } from '../types/database.js';
import { calculateAutoSchedule } from '../utils/autoScheduleCalculator.js';
import { expandRecurringTasks } from '../utils/recurrenceCalculator.js';
import { TaskService } from '../services/taskService.js';
import { getAuthenticatedSupabase } from '../config/supabase.js';

const router = express.Router();
router.use(authMiddleware);

const calendarEventService = new CalendarEventService();
const userSettingsService = new UserSettingsService();
const autoScheduleService = new AutoScheduleService();
const taskService = new TaskService();

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
 * Simulate auto-schedule with a hypothetical day-block inserted,
 * returning which tasks would be moved and where.
 */
async function simulateDayBlock(
  userId: string,
  authToken: string,
  blockDate: string,
  blockStartTime: Date,
  blockEndTime: Date
): Promise<{
  tasksToMove: Array<{
    task: Task;
    currentEvent: CalendarEventTask;
    proposedTime: { start: Date; end: Date } | null;
  }>;
  totalEventsCreated: number;
  totalEventsDeleted: number;
  violations: number;
}> {
  const taskClient = getAuthenticatedSupabase(authToken);
  const [allTasks, allEvents] = await Promise.all([
    taskService.getAllTasks(taskClient),
    calendarEventService.getAllCalendarEvents(authToken),
  ]);

  // Create a hypothetical day-block event
  const hypotheticalDayBlock = {
    id: 'hypothetical-day-block',
    title: 'Day blocked',
    start_time: blockStartTime.toISOString(),
    end_time: blockEndTime.toISOString(),
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_day_block: true,
    synced_from_google: false,
    linked_task_id: null as string | null,
    completed_at: null as Date | null,
    recurrence_id: null as string | null,
    recurrence_date: null as Date | null,
    google_event_id: null as string | null,
    description: null as string | null,
  };

  // Add the hypothetical block to the events list
  const eventsWithBlock = [...allEvents, hypotheticalDayBlock] as CalendarEventUnion[];

  // Get schedules
  const [schedules, activeSchedule] = await Promise.all([
    userSettingsService.getUserSchedules(userId, authToken),
    userSettingsService.getActiveSchedule(userId, authToken),
  ]);

  // Expand recurring tasks
  const recurringTaskSyntheticEvents = expandRecurringTasks(
    allTasks.filter(t => t.is_recurring && t.status !== 'completed'),
    allEvents.filter(e => isCalendarEventTask(e)) as CalendarEventTask[]
  );

  const allTaskEventsForScheduling = [
    ...allEvents.filter(
      e => isCalendarEventTask(e) && !(e as CalendarEventTask).completed_at
    ) as CalendarEventTask[],
    ...recurringTaskSyntheticEvents,
  ];

  // Calculate the proposed schedule with the day block
  const { taskEvents, totalViolations } = calculateAutoSchedule({
    tasks: allTasks.filter(t => t.status !== 'completed' && !t.is_reminder),
    existingEvents: allTaskEventsForScheduling,
    allCalendarEvents: eventsWithBlock,
    activeSchedule,
    eventDuration: 60,
    schedules,
  });

  // Compare current events vs proposed to find what moves
  const currentTaskEvents = allEvents.filter(
    e => isCalendarEventTask(e) && !(e as CalendarEventTask).completed_at
  ) as CalendarEventTask[];

  const currentByTask = new Map<string, CalendarEventTask[]>();
  for (const evt of currentTaskEvents) {
    const list = currentByTask.get(evt.linked_task_id) || [];
    list.push(evt);
    currentByTask.set(evt.linked_task_id, list);
  }

  const tasksToMove: Array<{
    task: Task;
    currentEvent: CalendarEventTask;
    proposedTime: { start: Date; end: Date } | null;
  }> = [];

  const proposedByTask = new Map<
    string,
    Array<{ start: Date; end: Date }>
  >();
  for (const { task, events: evts } of taskEvents) {
    proposedByTask.set(
      task.id,
      evts.map(e => ({ start: e.start_time, end: e.end_time }))
    );
  }

  const taskMap = new Map<string, Task>();
  for (const task of allTasks) {
    taskMap.set(task.id, task);
  }

  for (const [taskId, currentEvents] of currentByTask) {
    const proposedEvents = proposedByTask.get(taskId) || [];
    const task = taskMap.get(taskId);
    if (!task) continue;

    for (const currentEvt of currentEvents) {
      const currentStart = new Date(currentEvt.start_time).getTime();
      const currentEnd = new Date(currentEvt.end_time).getTime();

      // Check if this event falls within the day block
      const blockStart = blockStartTime.getTime();
      const blockEnd = blockEndTime.getTime();
      const isBlocked = currentStart < blockEnd && currentEnd > blockStart;

      if (!isBlocked) continue;

      // Find the corresponding proposed event
      const proposed = proposedEvents[0] || null;
      tasksToMove.push({
        task,
        currentEvent: currentEvt,
        proposedTime: proposed,
      });
    }
  }

  // Count changes
  const currentKeys = new Set(
    currentTaskEvents.map(
      e => `${e.linked_task_id}|${e.start_time}|${e.end_time}`
    )
  );
  const proposedKeys = new Set(
    taskEvents.flatMap(({ task: t, events: evts }) =>
      evts.map(
        e =>
          `${t.id}|${e.start_time.toISOString()}|${e.end_time.toISOString()}`
      )
    )
  );

  let eventsCreated = 0;
  let eventsDeleted = 0;
  for (const key of proposedKeys) {
    if (!currentKeys.has(key)) eventsCreated++;
  }
  for (const key of currentKeys) {
    if (!proposedKeys.has(key)) eventsDeleted++;
  }

  return {
    tasksToMove,
    totalEventsCreated: eventsCreated,
    totalEventsDeleted: eventsDeleted,
    violations: totalViolations,
  };
}

/**
 * POST /api/day-blocks/preview
 *
 * Simulates blocking a day and returns what tasks would be moved without
 * actually creating the block or running auto-schedule.
 *
 * Request body:
 *   { date: "YYYY-MM-DD", from_time?: "HH:MM" }
 *
 * Response:
 *   { tasksToMove: [...], totalEventsCreated: N, totalEventsDeleted: N, violations: N }
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

    const fromTime = from_time ?? floorTo15(new Date());
    if (!/^\d{2}:\d{2}$/.test(fromTime)) {
      return ResponseHelper.error(res, 'from_time must be HH:MM', 400);
    }

    const startTime = new Date(`${date}T${fromTime}:00`);
    if (isNaN(startTime.getTime())) {
      return ResponseHelper.error(
        res,
        'Invalid date/from_time combination',
        400
      );
    }

    const schedule = await userSettingsService.getActiveSchedule(
      authReq.userId,
      authReq.authToken
    );

    const dayOfWeek = startTime.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySchedule = schedule?.working_days?.[dayOfWeek];
    const workingEnd =
      (daySchedule != null ? daySchedule.end : undefined) ??
      schedule?.working_hours_end ??
      18;
    const endTime = new Date(
      `${date}T${String(workingEnd).padStart(2, '0')}:00:00`
    );

    if (startTime >= endTime) {
      return ResponseHelper.error(
        res,
        'Working day already over — no block possible',
        400,
        'The chosen time is at or after the end of your working hours'
      );
    }

    const result = await simulateDayBlock(
      authReq.userId,
      authReq.authToken,
      date,
      startTime,
      endTime
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
