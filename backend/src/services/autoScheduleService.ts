/**
 * AutoScheduleService — orchestrates the full auto-scheduling flow on the backend.
 *
 * Responsibilities:
 *  1. Fetch tasks, calendar events, and schedules for the authenticated user
 *  2. Compute the proposed schedule using calculateAutoSchedule
 *  3. Diff the proposed schedule against the current persisted events
 *  4. Apply the diff (create missing events, delete stale events)
 *  5. Return a summary of what changed
 */

import { isCalendarEventTask } from '../types/database.js';
import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
  CreateCalendarEventInput,
} from '../types/database.js';
import { TaskService } from './taskService.js';
import { CalendarEventService } from './calendarEventService.js';
import { UserSettingsService } from './userSettingsService.js';
import { calculateAutoSchedule } from '../utils/autoScheduleCalculator.js';
import { expandRecurringTasks } from '../utils/recurrenceCalculator.js';

const DEFAULT_EVENT_DURATION = 60; // minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTime(t: string | Date): number {
  const d = new Date(t);
  d.setMilliseconds(0);
  return d.getTime();
}

function eventKey(
  linkedTaskId: string,
  start: string | Date,
  end: string | Date
): string {
  return `${linkedTaskId}|${normalizeTime(start)}|${normalizeTime(end)}`;
}

function isSameSchedule(
  existingEvents: CalendarEventTask[],
  proposedEvents: Array<{
    linked_task_id: string;
    start_time: string;
    end_time: string;
  }>
): boolean {
  // Check raw lengths first: if DB has duplicates, raw count will differ from deduplicated count
  // This forces a diff cleanup even if deduplicated sets match
  if (existingEvents.length !== proposedEvents.length) return false;

  const existingSet = new Set(
    existingEvents.map(e =>
      eventKey(e.linked_task_id, e.start_time, e.end_time)
    )
  );

  const proposedSet = new Set(
    proposedEvents.map(e =>
      eventKey(e.linked_task_id, e.start_time, e.end_time)
    )
  );

  if (existingSet.size !== proposedSet.size) return false;

  for (const event of proposedEvents) {
    const key = eventKey(
      event.linked_task_id,
      event.start_time,
      event.end_time
    );
    if (!existingSet.has(key)) return false;
  }

  return true;
}

function dedupeProposedEvents(
  events: Array<{
    title: string;
    start_time: string;
    end_time: string;
    description?: string;
    linked_task_id: string;
    user_id: string;
  }>
): Array<{
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  linked_task_id: string;
  user_id: string;
}> {
  const byKey = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    byKey.set(
      eventKey(event.linked_task_id, event.start_time, event.end_time),
      event
    );
  }
  return Array.from(byKey.values());
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface AutoScheduleRunResult {
  unchanged: boolean;
  eventsCreated: number;
  eventsDeleted: number;
  violations: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AutoScheduleService {
  private taskService = new TaskService();
  private calendarEventService = new CalendarEventService();
  private userSettingsService = new UserSettingsService();

  /**
   * Run the full auto-schedule flow for the given user.
   * Returns a summary of what was changed (or unchanged).
   */
  async run(userId: string, authToken: string): Promise<AutoScheduleRunResult> {
    // 1. Fetch tasks
    const allTasks = await this.taskService.getAllTasks(authToken);
    console.log(`[AutoSchedule] fetched ${allTasks.length} tasks`);

    if (allTasks.length === 0) {
      return {
        unchanged: true,
        eventsCreated: 0,
        eventsDeleted: 0,
        violations: 0,
      };
    }

    // 2. Fetch all calendar events for this user (full history + future)
    const allEvents =
      await this.calendarEventService.getAllCalendarEvents(authToken);
    console.log(`[AutoSchedule] fetched ${allEvents.length} calendar events`);

    // 3. Enrich with full-horizon events for recurring tasks (fetch per-task if needed)
    const enrichedEvents = await this.fetchFullHorizonEvents(
      allTasks,
      allEvents,
      authToken
    );
    console.log(`[AutoSchedule] enriched to ${enrichedEvents.length} events`);

    // 4. Fetch schedules
    const schedules = await this.userSettingsService.getUserSchedules(
      userId,
      authToken
    );
    const activeSchedule = await this.userSettingsService.getActiveSchedule(
      userId,
      authToken
    );
    console.log(
      `[AutoSchedule] schedules: ${schedules.length}, active: ${activeSchedule?.id}`
    );

    // 5. Compute proposed schedule
    const { eventsToCreate, existingTaskEvents, violations } =
      this.computeProposedSchedule(
        userId,
        allTasks,
        enrichedEvents,
        activeSchedule,
        schedules
      );

    const uniqueEventsToCreate = dedupeProposedEvents(eventsToCreate);

    console.log(
      `[AutoSchedule] proposed: ${eventsToCreate.length} events (${uniqueEventsToCreate.length} unique), existing: ${existingTaskEvents.length}`
    );

    // 6. Compare
    if (isSameSchedule(existingTaskEvents, uniqueEventsToCreate)) {
      console.log('[AutoSchedule] schedule unchanged — skipping');
      return {
        unchanged: true,
        eventsCreated: 0,
        eventsDeleted: 0,
        violations,
      };
    }

    // 7. Apply diff
    console.log('[AutoSchedule] schedule differs — applying...');
    const { created, deleted } = await this.applyDiff(
      uniqueEventsToCreate,
      existingTaskEvents,
      authToken
    );

    return {
      unchanged: created === 0 && deleted === 0,
      eventsCreated: created,
      eventsDeleted: deleted,
      violations,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * For recurring tasks, enrich the event list with persisted events that may
   * fall outside any given calendar window, so the scheduler sees the full
   * 90-day horizon.
   *
   * Uses the already-fetched `baseEvents` list (which already contains ALL
   * calendar events for the user) and simply filters by linked_task_id —
   * no additional database round-trips required.
   */
  private async fetchFullHorizonEvents(
    tasks: Task[],
    baseEvents: CalendarEventUnion[],
    _authToken: string
  ): Promise<CalendarEventUnion[]> {
    const recurringTasks = tasks.filter(
      t => t.is_recurring && t.status !== 'completed'
    );
    if (recurringTasks.length === 0) return baseEvents;

    // getAllCalendarEvents already returns all events for the user.
    // The "full horizon" enrichment is only needed on the frontend where
    // events are scoped to a visible week.  On the backend we already have
    // the complete set, so simply return baseEvents.
    return baseEvents;
  }

  private computeProposedSchedule(
    userId: string,
    tasks: Task[],
    events: CalendarEventUnion[],
    activeSchedule: Schedule | null,
    schedules: Schedule[]
  ): {
    eventsToCreate: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id: string;
      user_id: string;
    }>;
    existingTaskEvents: CalendarEventTask[];
    violations: number;
  } {
    const allTaskEvents = events.filter(e =>
      isCalendarEventTask(e)
    ) as CalendarEventTask[];

    const existingTaskEvents = allTaskEvents.filter(e => !e.completed_at);

    // Expand recurring tasks into synthetic placeholders.
    // Pass ALL task events (including completed) so that dates with a completed
    // occurrence are not re-generated as synthetics.
    const recurringTaskSyntheticEvents = expandRecurringTasks(
      tasks,
      allTaskEvents
    );

    const allTaskEventsForScheduling = [
      ...existingTaskEvents,
      ...recurringTaskSyntheticEvents,
    ];

    const { taskEvents, totalViolations } = calculateAutoSchedule({
      tasks,
      existingEvents: allTaskEventsForScheduling,
      allCalendarEvents: events,
      activeSchedule,
      eventDuration: DEFAULT_EVENT_DURATION,
      schedules,
    });

    const eventsToCreate = taskEvents.flatMap(({ task, events: evts }) =>
      evts.map(event => {
        const base = {
          title: task.title,
          start_time: event.start_time.toISOString(),
          end_time: event.end_time.toISOString(),
          linked_task_id: task.id,
          user_id: userId,
        };
        return task.description !== undefined
          ? { ...base, description: task.description }
          : base;
      })
    );

    return { eventsToCreate, existingTaskEvents, violations: totalViolations };
  }

  private async applyDiff(
    eventsToCreate: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id: string;
      user_id: string;
    }>,
    existingTaskEvents: CalendarEventTask[],
    authToken: string
  ): Promise<{ created: number; deleted: number }> {
    const existingByKey = new Map(
      existingTaskEvents.map(event => [
        eventKey(event.linked_task_id, event.start_time, event.end_time),
        event,
      ])
    );

    const desiredByKey = new Map(
      eventsToCreate.map(event => [
        eventKey(event.linked_task_id, event.start_time, event.end_time),
        event,
      ])
    );

    const missingEvents = Array.from(desiredByKey.entries())
      .filter(([key]) => !existingByKey.has(key))
      .map(([, event]) => event);

    const seenKeys = new Set<string>();
    const eventsToDelete = existingTaskEvents.filter(event => {
      const key = eventKey(
        event.linked_task_id,
        event.start_time,
        event.end_time
      );
      if (!desiredByKey.has(key)) return true;
      if (seenKeys.has(key)) return true;
      seenKeys.add(key);
      return false;
    });

    console.log('[AutoSchedule:diff]', {
      toCreate: missingEvents.length,
      toDelete: eventsToDelete.length,
    });

    let created = 0;
    let deleted = 0;

    if (missingEvents.length > 0) {
      const inputs: CreateCalendarEventInput[] = missingEvents.map(event => ({
        ...event,
        completed_at: null,
      }));
      const results = await this.calendarEventService.createCalendarEventsBatch(
        inputs,
        authToken
      );
      created = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      if (failed > 0) {
        console.error(`[AutoSchedule] Failed to create ${failed} events`);
      }
    }

    if (eventsToDelete.length > 0) {
      const deleteResults =
        await this.calendarEventService.deleteCalendarEventsBatch(
          eventsToDelete.map(e => e.id),
          authToken
        );
      deleted = deleteResults.filter(r => r.success).length;
      const failedDeletes = deleteResults.filter(r => !r.success);
      if (failedDeletes.length > 0) {
        console.error(
          `[AutoSchedule] Failed to delete ${failedDeletes.length} events`
        );
      }
    }

    return { created, deleted };
  }
}
