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
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { calculateAutoSchedule } from '@/utils/autoScheduleCalculator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 1_000;
const THROTTLE_MS = 5_000;
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
      logger.debug(
        `Auto-schedule: Event mismatch for task ${event.linked_task_id} at ${event.start_time}`
      );
      return false;
    }
  }

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
  isInitialSyncComplete: boolean = true
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksMap, setTasksMap] = useState<Map<string, Task>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single guard: prevents concurrent scheduling runs
  const isSchedulingRef = useRef(false);
  const lastRunTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs that always point at the latest value without affecting dep arrays
  const refreshEventsRef = useRef(refreshEvents);
  refreshEventsRef.current = refreshEvents;

  const onTaskDroppedRef = useRef(onTaskDropped);
  onTaskDroppedRef.current = onTaskDropped;

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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
      currentTasks: Task[]
    ) => {
      if (!user) return;

      // Refresh events to get the latest server state
      const latestEvents = await refreshEventsRef.current();

      const existingTaskEvents = latestEvents.filter(
        event => isCalendarEventTask(event) && !event.completed_at
      ) as CalendarEventTask[];

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

      const eventsToDelete = Array.from(existingByKey.entries())
        .filter(([key]) => !desiredByKey.has(key))
        .map(([, event]) => event);

      if (missingEvents.length === 0 && eventsToDelete.length === 0) {
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

      const { taskEvents } = calculateAutoSchedule({
        tasks: tasksToUse,
        existingEvents: existingTaskEvents,
        allCalendarEvents: eventsToUse,
        activeSchedule: activeSchedule || null,
        eventDuration: DEFAULT_EVENT_DURATION,
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

      return { existingTaskEvents, eventsToCreate, allTasks: tasksToUse };
    },
    [user, activeSchedule]
  );

  // -----------------------------------------------------------------------
  // runFullSchedule — fetch fresh data, compute, compare, apply if needed
  // Manages isSchedulingRef + isRefreshing lifecycle fully.
  // -----------------------------------------------------------------------
  const runFullSchedule = useCallback(
    async (eventsOverride?: CalendarEventUnion[]) => {
      if (!user || isSchedulingRef.current) return;

      if (Date.now() - lastRunTimeRef.current < THROTTLE_MS) {
        logger.debug('Auto-schedule: Throttled (ran less than 5s ago)');
        return;
      }

      startScheduling();
      try {
        lastRunTimeRef.current = Date.now();

        // 1. Fetch fresh tasks
        const allTasks = await taskService.getAllTasks();
        setTasks(allTasks);
        const map = new Map<string, Task>();
        allTasks.forEach(task => map.set(task.id, task));
        setTasksMap(map);

        // 2. Use override events or fetch fresh
        const eventsToUse =
          eventsOverride ?? (await refreshEventsRef.current());

        // 3. Compute & compare
        const result = computeProposedSchedule(allTasks, eventsToUse);
        if (!result) return;

        const { existingTaskEvents, eventsToCreate } = result;

        if (isSameSchedule(existingTaskEvents, eventsToCreate)) {
          logger.info(
            'Auto-schedule: Schedule is already optimal. Skipping update.'
          );
          return;
        }

        // 4. Apply
        logger.info('Auto-schedule: Applying new schedule...');
        await applySchedule(eventsToCreate, allTasks);
      } catch (err) {
        logger.error('Auto-schedule run failed:', err);
        toast.error('Failed to schedule tasks');
      } finally {
        stopScheduling();
      }
    },
    [
      user,
      computeProposedSchedule,
      applySchedule,
      startScheduling,
      stopScheduling,
    ]
  );

  // -----------------------------------------------------------------------
  // handleAutoScheduleClick — explicit user action (always runs full flow)
  // -----------------------------------------------------------------------
  const handleAutoScheduleClick = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    try {
      const latestEvents = await refreshEventsRef.current();
      await runFullSchedule(latestEvents);
    } catch (err) {
      logger.error('Failed to fetch events for auto-scheduling:', err);
      const errorMessage =
        err instanceof Error
          ? err.message.includes('Unable to connect')
            ? err.message
            : 'Failed to load calendar events. Please ensure the backend server is running.'
          : 'Failed to load calendar events';
      toast.error(errorMessage);
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

      // Pure computation with in-memory data
      const result = computeProposedSchedule(tasksToUse, events);
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
    computeProposedSchedule,
    runFullSchedule,
  ]);

  // -----------------------------------------------------------------------
  // Stable fingerprint of schedule-relevant task data to drive the effect.
  // Changes when tasks are added/removed or when scheduling-relevant fields
  // (duration, status, updated_at) change.
  // -----------------------------------------------------------------------
  const tasksFingerprint = useMemo(
    () =>
      tasks
        .map(
          t =>
            `${t.id}:${t.planned_duration_minutes}:${t.actual_duration_minutes}:${t.status}:${(t.blockedBy ?? []).join(',')}:${t.updated_at ?? t.created_at}`
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
  }, [user, isInitialSyncComplete, tasksFingerprint, events.length]);

  return {
    tasksMap,
    handleAutoScheduleClick,
    isRefreshing,
  };
}
