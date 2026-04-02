import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, CalendarEventUnion, Schedule } from '@/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const THROTTLE_MS = 3_000;

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
  _schedules: Schedule[] = []
) {
  const [_tasks, setTasks] = useState<Task[]>([]);
  const [tasksMap, setTasksMap] = useState<Map<string, Task>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedWarning, setPinnedWarning] = useState<{
    tasks: Array<{ id: string; title: string }>;
    resolve: (unpinAll: boolean | null) => void;
  } | null>(null);

  // Single guard: prevents concurrent scheduling runs
  const isSchedulingRef = useRef(false);
  const lastRunTimeRef = useRef<number>(0);
  // Separate flag to close the async gap in handleAutoScheduleClick —
  // set synchronously before the async call so a second click is dropped.
  const isClickInFlightRef = useRef(false);
  // Timestamp of the last successful apply — used to suppress the
  // automatic checkAndMaybeApply that fires because applySchedule mutates
  // events (changing events.length), which the useEffect depends on.
  const lastAppliedAtRef = useRef<number>(0);
  // Safety net: cap consecutive auto-runs to prevent run-away loops.
  const consecutiveAutoRunsRef = useRef<number>(0);

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
    // Disable the button immediately so the UI reflects the in-flight state
    // even before the async getPinnedTasksPreview call completes.
    setIsRefreshing(true);

    try {
      // Check if any pinned tasks would be affected
      let pinnedTasks: Array<{ id: string; title: string }> = [];
      try {
        pinnedTasks = await calendarService.getPinnedTasksPreview();
      } catch {
        // Non-fatal: proceed without warning if preview fails
      }

      if (pinnedTasks.length > 0) {
        // Ask user what to do with pinned tasks
        const unpinAll = await new Promise<boolean | null>(resolve => {
          setPinnedWarning({
            tasks: pinnedTasks,
            resolve: (value: boolean | null) => {
              setPinnedWarning(null);
              resolve(value);
            },
          });
        });

        if (unpinAll === null) {
          // User cancelled
          return;
        }

        if (unpinAll) {
          // Unpin all affected tasks before scheduling; abort on any failure
          await Promise.all(
            pinnedTasks.map(t =>
              taskService.updateTask(t.id, { isManuallyPinned: false })
            )
          );
        }
        // If unpinAll === false: keep pinned, scheduler will skip them naturally
      }

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
      // Ensure the button is always re-enabled, even if runFullSchedule bailed
      // early (e.g. throttled) without calling stopScheduling() itself.
      setIsRefreshing(false);
    }
  }, [user, runFullSchedule]);

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
    loadTasks,
    handleAutoScheduleClick,
    isRefreshing,
    pinnedWarning,
    dismissPinnedWarning: () => {
      pinnedWarning?.resolve(false);
      setPinnedWarning(null);
    },
  };
}
