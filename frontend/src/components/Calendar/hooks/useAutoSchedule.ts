import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Task,
  CalendarEventUnion,
  Schedule,
} from '@/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 1_000;
const THROTTLE_MS = 3_000;
/** After applying changes, suppress auto-checks for this period so the
 *  self-caused events.length change does not re-trigger the scheduler. */
const APPLY_COOLDOWN_MS = 15_000;

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single guard: prevents concurrent scheduling runs
  const isSchedulingRef = useRef(false);
  const lastRunTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Separate flag to close the async gap in handleAutoScheduleClick —
  // set synchronously before the async call so a second click is dropped.
  const isClickInFlightRef = useRef(false);
  // Timestamp of the last successful apply — used to suppress the
  // automatic checkAndMaybeApply that fires because applySchedule mutates
  // events (changing events.length), which the useEffect depends on.
  const lastAppliedAtRef = useRef<number>(0);
  // Safety net: cap consecutive auto-runs to prevent run-away loops.
  const consecutiveAutoRunsRef = useRef<number>(0);
  const MAX_CONSECUTIVE_AUTO_RUNS = 2;

  // Always-fresh refs so stable useCallback closures see the latest value
  const refreshEventsRef = useRef(refreshEvents);
  refreshEventsRef.current = refreshEvents;

  const onTaskDroppedRef = useRef(onTaskDropped);
  onTaskDroppedRef.current = onTaskDropped;

  const isInitialSyncCompleteRef = useRef(isInitialSyncComplete);
  isInitialSyncCompleteRef.current = isInitialSyncComplete;

  // -----------------------------------------------------------------------
  // Helpers to manage isRefreshing safely
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
  // Load tasks (used for the tasksMap exposed to consumers)
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
  // runFullSchedule — delegates the heavy lifting to the backend endpoint
  // -----------------------------------------------------------------------
  const runFullSchedule = useCallback(async () => {
    if (!user || isSchedulingRef.current) return;

    if (!isInitialSyncCompleteRef.current) {
      console.log('[AUTOSCHEDULE:run] waiting for GCal sync — skipping');
      return;
    }

    if (Date.now() - lastRunTimeRef.current < THROTTLE_MS) {
      console.log('[AUTOSCHEDULE:run] throttled — skipping');
      return;
    }

    console.log('[AUTOSCHEDULE:run] starting (backend)...');
    startScheduling();
    try {
      lastRunTimeRef.current = Date.now();

      const result = await calendarService.runAutoSchedule();
      console.log('[AUTOSCHEDULE:run] backend result:', result);

      if (result.unchanged) {
        console.log('[AUTOSCHEDULE:run] schedule already optimal — done');
        logger.info('Auto-schedule: Schedule is already optimal.');
        return;
      }

      lastAppliedAtRef.current = Date.now();

      // Refresh calendar view to reflect the new events
      await refreshEventsRef.current();

      // Reload tasks so tasksMap is up to date
      await loadTasks();

      if (result.eventsCreated > 0) {
        const msg = `Auto-scheduled ${result.eventsCreated} event${result.eventsCreated > 1 ? 's' : ''}`;
        toast.success(msg, { duration: 4000 });
      }

      if (result.violations > 0) {
        toast.warning(
          `${result.violations} deadline violation${result.violations > 1 ? 's' : ''}`
        );
      }

      onTaskDroppedRef.current?.();
    } catch (err) {
      logger.error('Auto-schedule run failed:', err);
      toast.error(
        err instanceof Error && err.message.includes('Unable to connect')
          ? err.message
          : 'Failed to schedule tasks'
      );
    } finally {
      stopScheduling();
    }
  }, [user, startScheduling, stopScheduling, loadTasks]);

  // -----------------------------------------------------------------------
  // handleAutoScheduleClick — explicit user action
  // -----------------------------------------------------------------------
  const handleAutoScheduleClick = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    if (isClickInFlightRef.current || isSchedulingRef.current) {
      logger.debug('Auto-schedule: already in progress, ignoring click');
      return;
    }
    isClickInFlightRef.current = true;

    try {
      lastAppliedAtRef.current = 0;
      consecutiveAutoRunsRef.current = 0;
      await runFullSchedule();
    } catch (err) {
      logger.error('Failed to run auto-schedule on click:', err);
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
  // checkAndMaybeApply — lightweight check that delegates to runFullSchedule
  // -----------------------------------------------------------------------
  const checkAndMaybeApply = useCallback(async () => {
    if (!user || !isInitialSyncComplete || isSchedulingRef.current) return;

    if (Date.now() - lastAppliedAtRef.current < APPLY_COOLDOWN_MS) {
      console.log('[AUTOSCHEDULE:check] cooling down after recent apply — skipping');
      return;
    }

    if (consecutiveAutoRunsRef.current >= MAX_CONSECUTIVE_AUTO_RUNS) {
      console.log(
        `[AUTOSCHEDULE:check] max consecutive auto-runs (${MAX_CONSECUTIVE_AUTO_RUNS}) reached — skipping`
      );
      return;
    }
    consecutiveAutoRunsRef.current += 1;

    try {
      await runFullSchedule();
    } catch (err) {
      logger.error('Auto-schedule check failed:', err);
    }
  }, [user, isInitialSyncComplete, runFullSchedule]);

  // -----------------------------------------------------------------------
  // Stable fingerprint of schedule-relevant task data to drive the effect.
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

  // Fingerprint of schedule config to detect changes in working hours / days
  const schedulesFingerprint = useMemo(
    () =>
      schedules
        .map(
          s =>
            `${s.id}:${s.working_hours_start}:${s.working_hours_end}:${s.is_default}:${JSON.stringify(s.working_days ?? null)}`
        )
        .join('|'),
    [schedules]
  );

  // -----------------------------------------------------------------------
  // Effect: run checkAndMaybeApply when schedule-relevant data changes
  // or when the user returns to the tab.
  // -----------------------------------------------------------------------
  const checkAndMaybeApplyRef = useRef(checkAndMaybeApply);
  checkAndMaybeApplyRef.current = checkAndMaybeApply;

  // -----------------------------------------------------------------------
  // Note: Auto-triggering on schedule-relevant data changes has been removed.
  // Auto-schedule is now triggered event-driven from:
  // - Task create/update/delete via taskService
  // - Project create/delete via projectService
  // - Schedule updates via API routes
  // - Google Calendar sync completion
  // -----------------------------------------------------------------------
  // Manual trigger via handleAutoScheduleClick button remains available.

  return {
    tasksMap,
    handleAutoScheduleClick,
    isRefreshing,
  };
}
