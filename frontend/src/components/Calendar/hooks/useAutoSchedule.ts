import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Task,
  CalendarEventUnion,
  isCalendarEventTask,
  CalendarEventTask,
  Schedule,
} from '@/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { userSettingsService } from '@/services/userSettingsService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { calculateAutoSchedule } from '@/utils/autoScheduleCalculator';
import { expandRecurringTasks } from '@/utils/recurrenceCalculator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 1_000;
const THROTTLE_MS = 3_000;
const DEFAULT_EVENT_DURATION = 60;

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

/**
 * Compare two schedules by their event keys.
 * Returns `true` when both contain exactly the same set of
 * (linked_task_id, start_time, end_time) tuples.
 */
function isSameSchedule(
  existingEvents: CalendarEventTask[],
  proposedEvents: Array<{
    linked_task_id: string;
    start_time: string;
    end_time: string;
  }>
): boolean {
  if (existingEvents.length !== proposedEvents.length) {
    console.log(
      `[AUTOSCHEDULE:compare] count mismatch: existing=${existingEvents.length} proposed=${proposedEvents.length} → false`
    );
    logger.debug(
      `Auto-schedule: Count mismatch (Existing: ${existingEvents.length}, Proposed: ${proposedEvents.length})`
    );
    return false;
  }

  const existingSet = new Set(
    existingEvents.map(e =>
      eventKey(e.linked_task_id, e.start_time, e.end_time)
    )
  );

  for (const event of proposedEvents) {
    const key = eventKey(
      event.linked_task_id,
      event.start_time,
      event.end_time
    );
    if (!existingSet.has(key)) {
      console.log(`[AUTOSCHEDULE:compare] mismatch on key ${key} → false`);
      logger.debug(
        `Auto-schedule: Event mismatch for task ${event.linked_task_id} at ${event.start_time}`
      );
      return false;
    }
  }

  console.log(
    `[AUTOSCHEDULE:compare] schedules match (${existingEvents.length} events) → true`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAutoSchedule(
  user: { id: string } | null,
  events: CalendarEventUnion[],
  refreshEvents: () => Promise<CalendarEventUnion[]>,
  onTaskDropped?: () => void,
  activeSchedule?: Schedule | null,
  isInitialSyncComplete: boolean = true,
  schedules: Schedule[] = []
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksMap, setTasksMap] = useState<Map<string, Task>>(new Map());
  const [schedulesState, setSchedulesState] = useState<Schedule[]>(schedules);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single guard: prevents concurrent scheduling runs
  const isSchedulingRef = useRef(false);
  const lastRunTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Separate flag to close the async gap in handleAutoScheduleClick —
  // set synchronously before refreshEvents() so a second click arriving
  // before the first enters runFullSchedule is still blocked.
  const isClickInFlightRef = useRef(false);

  // Refs that always point at the latest value without affecting dep arrays
  const refreshEventsRef = useRef(refreshEvents);
  refreshEventsRef.current = refreshEvents;

  const onTaskDroppedRef = useRef(onTaskDropped);
  onTaskDroppedRef.current = onTaskDropped;

  // Always-fresh ref for isInitialSyncComplete so runFullSchedule (a stable
  // useCallback) can guard against running before GCal sync finishes without
  // needing isInitialSyncComplete in its dependency array.
  const isInitialSyncCompleteRef = useRef(isInitialSyncComplete);
  isInitialSyncCompleteRef.current = isInitialSyncComplete;

  // -----------------------------------------------------------------------
  // Helpers to manage isRefreshing safely via isSchedulingRef
  // -----------------------------------------------------------------------
  const startScheduling = useCallback(() => {
    isSchedulingRef.current = true;
    setIsRefreshing(true);
  }, []);

  const stopScheduling = useCallback(() => {
    isSchedulingRef.current = false;
    setIsRefreshing(false);
  }, []);

  // -----------------------------------------------------------------------
  // Load tasks
  // -----------------------------------------------------------------------
  const loadTasks = useCallback(async (): Promise<Task[]> => {
    try {
      const allTasks = await taskService.getAllTasks();
      setTasks(allTasks);
      const map = new Map<string, Task>();
      allTasks.forEach(task => map.set(task.id, task));
      setTasksMap(map);
      return allTasks;
    } catch (err) {
      logger.error('Failed to fetch tasks for auto-scheduling:', err);
      return [];
    }
  }, []);

  const loadSchedules = useCallback(async (): Promise<Schedule[]> => {
    if (!user?.id) return [];
    try {
      const allSchedules = await userSettingsService.getUserSchedules(user.id);
      setSchedulesState(allSchedules);
      return allSchedules;
    } catch (err) {
      logger.error('Failed to fetch schedules for auto-scheduling:', err);
      return [];
    }
  }, [user?.id]);

  // Sync schedules prop to state
  useEffect(() => {
    if (schedules.length > 0) {
      setSchedulesState(schedules);
    }
  }, [schedules]);

  useEffect(() => {
    loadTasks();
    // Only load schedules from API if not provided as prop
    if (schedules.length === 0) {
      loadSchedules();
    }
  }, [loadTasks, loadSchedules, schedules.length]);

  // -----------------------------------------------------------------------
  // applySchedule — mutates the backend (create / delete events)
  // Assumes isSchedulingRef is already true when called.
  // -----------------------------------------------------------------------
  const applySchedule = useCallback(
    async (
      eventsToCreate: Array<{
        title: string;
        start_time: string;
        end_time: string;
        description?: string;
        linked_task_id: string;
        user_id: string;
      }>,
      currentTasks: Task[],
      // Pre-computed from the same fetch used in computeProposedSchedule — avoids a
      // redundant GET /calendar-events request inside applySchedule.
      prefetchedTaskEvents: CalendarEventTask[]
    ) => {
      if (!user) return;

      console.log('[AUTOSCHEDULE:apply] start', {
        proposed: eventsToCreate.length,
        prefetched: prefetchedTaskEvents.length,
        proposedByTask: Object.fromEntries(
          eventsToCreate.reduce((m, e) => {
            m.set(e.linked_task_id, (m.get(e.linked_task_id) ?? 0) + 1);
            return m;
          }, new Map<string, number>())
        ),
        prefetchedByTask: Object.fromEntries(
          prefetchedTaskEvents.reduce((m, e) => {
            m.set(e.linked_task_id, (m.get(e.linked_task_id) ?? 0) + 1);
            return m;
          }, new Map<string, number>())
        ),
      });

      const existingByKey = new Map(
        prefetchedTaskEvents.map(event => [
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

      // Delete any event whose key is absent from the desired set, PLUS any
      // duplicate events (same linked_task_id + start + end) that snuck into
      // the DB from previous scheduling runs.  The Map above keeps only one
      // representative per key; iterate the full list to catch extras.
      const seenKeys = new Set<string>();
      const eventsToDelete = prefetchedTaskEvents.filter(event => {
        const key = eventKey(
          event.linked_task_id,
          event.start_time,
          event.end_time
        );
        if (!desiredByKey.has(key)) return true; // not in desired → delete
        if (seenKeys.has(key)) return true; // duplicate → delete
        seenKeys.add(key);
        return false;
      });

      console.log('[AUTOSCHEDULE:apply] diff', {
        toCreate: missingEvents.length,
        toDelete: eventsToDelete.length,
        toCreateKeys: missingEvents.map(
          e =>
            `${e.linked_task_id}|${new Date(e.start_time).toLocaleDateString()}`
        ),
        toDeleteKeys: eventsToDelete.map(
          e =>
            `${e.linked_task_id}|${new Date(e.start_time).toLocaleDateString()}|id=${e.id}`
        ),
      });

      if (missingEvents.length === 0 && eventsToDelete.length === 0) {
        console.log('[AUTOSCHEDULE:apply] no changes — skipping');
        logger.info('Auto-schedule: No changes detected. Skipping update.');
        return;
      }

      // Create events
      let createResults: Array<{
        success: boolean;
        event?: CalendarEventUnion;
        error?: string;
        index: number;
      }> = [];

      if (missingEvents.length > 0) {
        createResults = await calendarService.createCalendarEventsBatch(
          missingEvents.map(event => ({ ...event, completed_at: null }))
        );
      }

      const successful = createResults.filter(r => r.success).length;
      const failed = createResults.filter(r => !r.success).length;

      if (failed > 0) {
        const failures = createResults.filter(r => !r.success);
        logger.error(
          `[useAutoSchedule] Failed to create ${failed} events:`,
          failures.map(r => ({ index: r.index, error: r.error }))
        );
        toast.error(`Failed to create ${failed} event${failed > 1 ? 's' : ''}`);
        return;
      }

      // Delete stale events
      if (eventsToDelete.length > 0) {
        const deleteResults = await calendarService.deleteCalendarEventsBatch(
          eventsToDelete.map(event => event.id)
        );

        const failedDeletes = deleteResults.filter(r => !r.success);
        if (failedDeletes.length > 0) {
          logger.error(
            `[useAutoSchedule] Failed to delete ${failedDeletes.length} events:`,
            failedDeletes.map(r => ({ id: r.id, error: r.error }))
          );
          toast.error(
            `Failed to delete ${failedDeletes.length} event${failedDeletes.length > 1 ? 's' : ''}`
          );
        }
      }

      // Refresh calendar events to reflect changes
      await refreshEventsRef.current();

      // Toasts
      if (successful > 0) {
        const scheduledTaskIds = new Set(
          eventsToCreate.map(e => e.linked_task_id)
        );
        toast.success(
          `Auto-scheduled ${successful} event${successful > 1 ? 's' : ''} for ${scheduledTaskIds.size} task${scheduledTaskIds.size > 1 ? 's' : ''}`,
          { duration: 4000 }
        );
      }

      const violations = eventsToCreate.filter(event => {
        const task = currentTasks.find(t => t.id === event.linked_task_id);
        if (!task?.due_date) return false;
        const eventStart = new Date(event.start_time);
        const deadline = new Date(task.due_date);
        deadline.setHours(23, 59, 59, 999);
        return eventStart > deadline;
      }).length;

      if (violations > 0) {
        toast.warning(
          `${violations} deadline violation${violations > 1 ? 's' : ''}`
        );
      }

      onTaskDroppedRef.current?.();
    },
    [user]
  );

  // -----------------------------------------------------------------------
  // computeProposedSchedule — pure calculation, no side-effects
  // -----------------------------------------------------------------------
  const computeProposedSchedule = useCallback(
    (tasksToUse: Task[], eventsToUse: CalendarEventUnion[]) => {
      if (!user) return null;

      const existingTaskEvents = eventsToUse.filter(
        e => isCalendarEventTask(e) && !e.completed_at
      ) as CalendarEventTask[];

      console.log('[AUTOSCHEDULE:propose] start', {
        tasks: tasksToUse.length,
        totalEvents: eventsToUse.length,
        existingTaskEvents: existingTaskEvents.length,
        existingByTask: Object.fromEntries(
          existingTaskEvents.reduce((m, e) => {
            m.set(e.linked_task_id, (m.get(e.linked_task_id) ?? 0) + 1);
            return m;
          }, new Map<string, number>())
        ),
      });

      // Expand recurring tasks to synthetic events for the 90-day horizon
      const recurringTaskSyntheticEvents = expandRecurringTasks(
        tasksToUse,
        existingTaskEvents
      );

      // Combine existing events with synthetic recurring task events
      const allTaskEventsForScheduling = [
        ...existingTaskEvents,
        ...recurringTaskSyntheticEvents,
      ];

      const { taskEvents } = calculateAutoSchedule({
        tasks: tasksToUse,
        existingEvents: allTaskEventsForScheduling,
        allCalendarEvents: eventsToUse,
        activeSchedule: activeSchedule || null,
        eventDuration: DEFAULT_EVENT_DURATION,
        schedules: schedulesState,
      });

      const eventsToCreate = taskEvents.flatMap(({ task, events: evts }) =>
        evts.map(event => ({
          title: task.title,
          start_time: event.start_time.toISOString(),
          end_time: event.end_time.toISOString(),
          description: task.description,
          linked_task_id: task.id,
          user_id: user.id,
        }))
      );

      console.log('[AUTOSCHEDULE:propose] result', {
        proposedTotal: eventsToCreate.length,
        proposedByTask: Object.fromEntries(
          eventsToCreate.reduce((m, e) => {
            m.set(e.linked_task_id, (m.get(e.linked_task_id) ?? 0) + 1);
            return m;
          }, new Map<string, number>())
        ),
        isSamePrelim: existingTaskEvents.length === eventsToCreate.length,
      });

      return { existingTaskEvents, eventsToCreate, allTasks: tasksToUse };
    },
    [user, activeSchedule, schedulesState]
  );

  // -----------------------------------------------------------------------
  // fetchFullHorizonEvents — enrich week-scoped events with ALL persisted
  // events for recurring tasks so the scheduler sees the full 90-day horizon
  // and does not re-create events that exist outside the visible week.
  // -----------------------------------------------------------------------
  const fetchFullHorizonEvents = useCallback(
    async (
      tasksToUse: Task[],
      weekEvents: CalendarEventUnion[]
    ): Promise<CalendarEventUnion[]> => {
      const recurringTasks = tasksToUse.filter(
        t => t.is_recurring && t.status !== 'completed'
      );
      if (recurringTasks.length === 0) return weekEvents;

      const existingIds = new Set(weekEvents.map(e => e.id));
      const extraEventArrays = await Promise.all(
        recurringTasks.map(t => calendarService.getCalendarEventsByTaskId(t.id))
      );

      const enriched = [...weekEvents];
      for (const taskEvents of extraEventArrays) {
        for (const event of taskEvents) {
          if (!existingIds.has(event.id)) {
            enriched.push(event);
            existingIds.add(event.id);
          }
        }
      }

      console.log('[AUTOSCHEDULE:horizon] enriched events', {
        weekCount: weekEvents.length,
        enrichedCount: enriched.length,
        recurringTaskCount: recurringTasks.length,
      });
      return enriched;
    },
    []
  );

  // -----------------------------------------------------------------------
  // runFullSchedule — fetch fresh data, compute, compare, apply if needed
  // Manages isSchedulingRef + isRefreshing lifecycle fully.
  // -----------------------------------------------------------------------
  const runFullSchedule = useCallback(async () => {
    if (!user || isSchedulingRef.current) return;

    // Block until Google Calendar initial sync has finished so we don't
    // place task events on top of GCal events that haven't been loaded yet.
    if (!isInitialSyncCompleteRef.current) {
      console.log('[AUTOSCHEDULE:run] waiting for GCal sync — skipping');
      logger.debug(
        'Auto-schedule: Waiting for Google Calendar sync to complete'
      );
      return;
    }

    if (Date.now() - lastRunTimeRef.current < THROTTLE_MS) {
      console.log('[AUTOSCHEDULE:run] throttled — skipping');
      logger.debug('Auto-schedule: Throttled (ran less than 5s ago)');
      return;
    }

    console.log('[AUTOSCHEDULE:run] starting...');
    startScheduling();
    try {
      lastRunTimeRef.current = Date.now();

      // 1. Fetch fresh tasks
      const allTasks = await taskService.getAllTasks();
      setTasks(allTasks);
      const map = new Map<string, Task>();
      allTasks.forEach(task => map.set(task.id, task));
      setTasksMap(map);
      console.log('[AUTOSCHEDULE:run] fetched tasks:', allTasks.length);

      // 2. Always fetch fresh events from the API so we have the latest
      //    state (including any Google Calendar events synced moments ago).
      //    An eventsOverride is only used as a hint — we still re-fetch to
      //    guarantee we never schedule on top of newly-synced GCal events.
      const weekEvents = await refreshEventsRef.current();
      console.log('[AUTOSCHEDULE:run] week events:', weekEvents.length);

      // 2b. Enrich with full-horizon recurring task events so we see
      //     persisted events outside the visible week.
      const eventsToUse = await fetchFullHorizonEvents(allTasks, weekEvents);
      console.log(
        '[AUTOSCHEDULE:run] events after enrichment:',
        eventsToUse.length
      );

      // 3. Compute & compare
      const result = computeProposedSchedule(allTasks, eventsToUse);
      if (!result) return;

      const { existingTaskEvents, eventsToCreate } = result;

      if (isSameSchedule(existingTaskEvents, eventsToCreate)) {
        console.log('[AUTOSCHEDULE:run] schedule already optimal — done');
        logger.info(
          'Auto-schedule: Schedule is already optimal. Skipping update.'
        );
        return;
      }

      // 4. Apply — pass in already-fetched existingTaskEvents to avoid a
      //    redundant GET /calendar-events inside applySchedule.
      console.log('[AUTOSCHEDULE:run] schedule differs — applying...');
      logger.info('Auto-schedule: Applying new schedule...');
      await applySchedule(eventsToCreate, allTasks, existingTaskEvents);
      console.log('[AUTOSCHEDULE:run] done');
    } catch (err) {
      logger.error('Auto-schedule run failed:', err);
      toast.error('Failed to schedule tasks');
    } finally {
      stopScheduling();
    }
  }, [
    user,
    fetchFullHorizonEvents,
    computeProposedSchedule,
    applySchedule,
    startScheduling,
    stopScheduling,
  ]);

  // -----------------------------------------------------------------------
  // handleAutoScheduleClick — explicit user action (always runs full flow)
  // -----------------------------------------------------------------------
  const handleAutoScheduleClick = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    // Guard here — before the async refreshEvents call — so that a second
    // click while the first is still running (or even just fetching events)
    // is dropped immediately, preventing duplicate event creation.
    // isClickInFlightRef is set synchronously (no async gap) so two rapid
    // clicks can never both slip through.
    if (isClickInFlightRef.current || isSchedulingRef.current) {
      logger.debug('Auto-schedule: already in progress, ignoring click');
      return;
    }
    isClickInFlightRef.current = true;

    try {
      await runFullSchedule();
    } catch (err) {
      logger.error('Failed to fetch events for auto-scheduling:', err);
      const errorMessage =
        err instanceof Error
          ? err.message.includes('Unable to connect')
            ? err.message
            : 'Failed to load calendar events. Please ensure the backend server is running.'
          : 'Failed to load calendar events';
      toast.error(errorMessage);
    } finally {
      isClickInFlightRef.current = false;
    }
  }, [user, runFullSchedule]);

  // -----------------------------------------------------------------------
  // checkAndMaybeApply — lightweight in-memory check, only fetches if needed
  // -----------------------------------------------------------------------
  const checkAndMaybeApply = useCallback(async () => {
    if (!user || !isInitialSyncComplete || isSchedulingRef.current) return;

    try {
      // Ensure we have tasks — fetch if empty (e.g. first mount)
      const tasksToUse = tasks.length > 0 ? tasks : await loadTasks();
      if (tasksToUse.length === 0) return;

      // Enrich with full-horizon recurring task events so the comparison
      // sees persisted events outside the current visible week.
      const enrichedEvents = await fetchFullHorizonEvents(tasksToUse, events);
      const result = computeProposedSchedule(tasksToUse, enrichedEvents);
      if (!result) return;

      const { existingTaskEvents, eventsToCreate } = result;

      if (isSameSchedule(existingTaskEvents, eventsToCreate)) {
        logger.info(
          'Auto-schedule: Schedule is already optimal. Skipping update.'
        );
        return;
      }

      // Schedule differs — run the full flow (fetches fresh data + applies)
      logger.info('Auto-schedule: Schedule differs. Running full apply...');
      await runFullSchedule();
    } catch (err) {
      logger.error('Auto-schedule check failed:', err);
    }
  }, [
    user,
    isInitialSyncComplete,
    tasks,
    events,
    loadTasks,
    fetchFullHorizonEvents,
    computeProposedSchedule,
    runFullSchedule,
  ]);

  // -----------------------------------------------------------------------
  // Stable fingerprint of schedule-relevant task data to drive the effect.
  // Changes when tasks are added/removed or when scheduling-relevant fields
  // (duration, status, updated_at, recurrence settings) change.
  // -----------------------------------------------------------------------
  const tasksFingerprint = useMemo(
    () =>
      tasks
        .map(
          t =>
            `${t.id}:${t.planned_duration_minutes}:${t.actual_duration_minutes}:${t.status}:${(t.blockedBy ?? []).join(',')}:${t.is_recurring}:${t.recurrence_pattern}:${t.recurrence_interval}:${t.updated_at ?? t.created_at}`
        )
        .join('|'),
    [tasks]
  );

  // -----------------------------------------------------------------------
  // Effect: run checkAndMaybeApply when schedule-relevant data changes
  // or when the user returns to the tab.
  // -----------------------------------------------------------------------
  const checkAndMaybeApplyRef = useRef(checkAndMaybeApply);
  checkAndMaybeApplyRef.current = checkAndMaybeApply;

  useEffect(() => {
    if (!user || !isInitialSyncComplete) return;

    const scheduleRun = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        checkAndMaybeApplyRef.current();
      }, DEBOUNCE_MS);
    };

    // Run on mount / when deps change
    scheduleRun();

    // Run when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRun();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    user,
    isInitialSyncComplete,
    tasksFingerprint,
    events.length,
    schedulesState.length,
  ]);

  return {
    tasksMap,
    handleAutoScheduleClick,
    isRefreshing,
  };
}
