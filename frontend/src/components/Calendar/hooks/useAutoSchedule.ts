import { useState, useEffect, useCallback, useRef } from 'react';
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
  const isSchedulingRef = useRef(false);

  // Load tasks for deadline checking
  const loadTasks = useCallback(async () => {
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

  const handleAutoSchedule = useCallback(
    async (
      eventsToCreate: Array<{
        title: string;
        start_time: string;
        end_time: string;
        description?: string;
        linked_task_id: string;
        user_id: string;
      }>,
      currentTasks?: Task[] // Optional tasks override
    ) => {
      if (!user) {
        toast.error('You must be logged in to schedule tasks');
        return;
      }

      try {
        isSchedulingRef.current = true;
        // Refresh events first to ensure we have the latest data
        const latestEvents = await refreshEvents();

        const existingTaskEvents = latestEvents.filter(
          event => isCalendarEventTask(event) && !event.completed_at
        ) as CalendarEventTask[];

        const normalizeTime = (t: string | Date) => {
          const d = new Date(t);
          d.setMilliseconds(0);
          return d.getTime();
        };

        const toKey = (linkedTaskId: string, start: string, end: string) =>
          `${linkedTaskId}|${normalizeTime(start)}|${normalizeTime(end)}`;

        const existingByKey = new Map(
          existingTaskEvents.map(event => [
            toKey(
              event.linked_task_id,
              event.start_time.toString(),
              event.end_time.toString()
            ),
            event,
          ])
        );

        const desiredByKey = new Map(
          eventsToCreate.map(event => [
            toKey(event.linked_task_id, event.start_time, event.end_time),
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

        let createResults: Array<{
          success: boolean;
          event?: CalendarEventUnion;
          error?: string;
          index: number;
        }> = [];

        if (missingEvents.length > 0) {
          createResults = await calendarService.createCalendarEventsBatch(
            missingEvents.map(event => ({
              ...event,
              completed_at: null,
            }))
          );
        }

        const successful = createResults.filter(r => r.success).length;
        const failed = createResults.filter(r => !r.success).length;

        // Use provided tasks or state tasks
        const tasksToUse = currentTasks || tasks;
        const violations = eventsToCreate.filter(event => {
          const task = tasksToUse.find(t => t.id === event.linked_task_id);
          if (!task?.due_date) return false;
          const eventStart = new Date(event.start_time);
          const deadline = new Date(task.due_date);
          deadline.setHours(23, 59, 59, 999);
          return eventStart > deadline;
        }).length;

        if (failed > 0) {
          const failures = createResults.filter(r => !r.success);
          logger.error(
            `[useAutoSchedule] Failed to create ${failed} events:`,
            failures.map(r => ({ index: r.index, error: r.error }))
          );
          toast.error(
            `Failed to create ${failed} event${failed > 1 ? 's' : ''}`
          );
          return;
        }

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

        // Refresh calendar events
        await refreshEvents();

        // Show detailed summary toast
        if (successful > 0) {
          const scheduledTaskIds = new Set(
            eventsToCreate.map(e => e.linked_task_id)
          );
          toast.success(
            `Auto-scheduled ${successful} event${successful > 1 ? 's' : ''} for ${scheduledTaskIds.size} task${scheduledTaskIds.size > 1 ? 's' : ''}`,
            { duration: 4000 }
          );
        }
        if (violations > 0) {
          toast.warning(
            `${violations} deadline violation${violations > 1 ? 's' : ''}`
          );
        }

        // Notify parent to refresh task list
        onTaskDropped?.();
      } catch (err) {
        logger.error('Failed to auto-schedule tasks:', err);
        toast.error('Failed to schedule tasks');
      } finally {
        isSchedulingRef.current = false;
      }
    },
    [user, refreshEvents, onTaskDropped, tasks]
  );

  const isSameSchedule = (
    existingEvents: CalendarEventTask[],
    proposedEvents: Array<{
      linked_task_id: string;
      start_time: string;
      end_time: string;
    }>
  ) => {
    // If counts differ, they are different
    if (existingEvents.length !== proposedEvents.length) {
      logger.debug(
        `Auto-schedule: Count mismatch (Existing: ${existingEvents.length}, Proposed: ${proposedEvents.length})`
      );
      return false;
    }

    const normalizeTime = (t: string | Date) => {
      const d = new Date(t);
      d.setMilliseconds(0);
      return d.getTime();
    };

    // Create unique keys for comparison: "taskId|startTime|endTime"
    const existingSet = new Set(
      existingEvents.map(
        e =>
          `${e.linked_task_id}|${normalizeTime(e.start_time)}|${normalizeTime(e.end_time)}`
      )
    );

    // Check if every proposed event exists in current events
    for (const event of proposedEvents) {
      const key = `${event.linked_task_id}|${normalizeTime(event.start_time)}|${normalizeTime(event.end_time)}`;
      if (!existingSet.has(key)) {
        logger.debug(
          `Auto-schedule: Event mismatch for task ${event.linked_task_id} at ${event.start_time}`
        );
        return false;
      }
    }

    return true;
  };

  const lastRunTimeRef = useRef<number>(0);

  const runAutoSchedule = useCallback(
    async (eventsOverride?: CalendarEventUnion[]) => {
      if (!user || isSchedulingRef.current) return;

      // Throttle to prevent loops (max once per 5 seconds)
      if (Date.now() - lastRunTimeRef.current < 5000) {
        logger.debug('Auto-schedule: Throttled (ran less than 5s ago)');
        return;
      }

      try {
        lastRunTimeRef.current = Date.now();
        // 1. Fetch fresh tasks (events are passed via prop)
        const allTasks = await taskService.getAllTasks();
        setTasks(allTasks);

        const map = new Map<string, Task>();
        allTasks.forEach(task => map.set(task.id, task));
        setTasksMap(map);

        // 2. Filter existing events
        const eventsToUse = eventsOverride ?? events;
        const existingTaskEvents = eventsToUse.filter(
          e => isCalendarEventTask(e) && !e.completed_at
        ) as CalendarEventTask[];

        // 3. Calculate optimal schedule
        const { taskEvents } = calculateAutoSchedule({
          tasks: allTasks,
          existingEvents: existingTaskEvents,
          allCalendarEvents: eventsToUse,
          activeSchedule: activeSchedule || null,
          eventDuration: 60, // Default duration
        });

        // 4. Flatten to events to create
        const eventsToCreate = taskEvents.flatMap(({ task, events }) =>
          events.map(event => ({
            title: task.title,
            start_time: event.start_time.toISOString(),
            end_time: event.end_time.toISOString(),
            description: task.description,
            linked_task_id: task.id,
            user_id: user.id,
          }))
        );

        // 5. Compare with existing schedule
        if (isSameSchedule(existingTaskEvents, eventsToCreate)) {
          logger.info(
            'Auto-schedule: Schedule is already optimal. Skipping update.'
          );
          return;
        }

        logger.info('Auto-schedule: Applying new schedule...');
        await handleAutoSchedule(eventsToCreate, allTasks);
      } catch (err) {
        logger.error('Auto-schedule run failed:', err);
      }
    },
    [user, activeSchedule, events, handleAutoSchedule]
  );

  const handleAutoScheduleClick = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    try {
      const latestEvents = await refreshEvents();
      await runAutoSchedule(latestEvents);
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
  }, [user, refreshEvents, runAutoSchedule]);

  // Trigger auto-schedule on mount and when key dependencies change
  // We use a timeout to debounce and avoid rapid re-runs
  useEffect(() => {
    if (!user || !isInitialSyncComplete) return;

    const timer = setTimeout(() => {
      runAutoSchedule();
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [runAutoSchedule, user, events, tasks.length, isInitialSyncComplete]);
  // We depend on lengths to catch adds/removes, but avoid deep equality checks on objects

  return {
    tasksMap,
    handleAutoScheduleClick,
  };
}
