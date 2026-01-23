import { useState, useEffect } from 'react';
import {
  Task,
  CalendarEventUnion,
  isCalendarEventTask,
} from '@shared/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function useAutoSchedule(
  user: { id: string } | null,
  events: CalendarEventUnion[],
  refreshEvents: () => Promise<CalendarEventUnion[]>,
  onTaskDropped?: () => void
) {
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksMap, setTasksMap] = useState<Map<string, Task>>(new Map());

  // Load tasks for deadline checking
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const allTasks = await taskService.getAllTasks();
        setTasks(allTasks);
        const map = new Map<string, Task>();
        allTasks.forEach(task => map.set(task.id, task));
        setTasksMap(map);
      } catch (err) {
        logger.error('Failed to load tasks:', err);
      }
    };
    loadTasks();
  }, []);

  const handleAutoScheduleClick = async () => {
    try {
      // Refresh both tasks and events before opening dialog
      // This ensures the dialog has the latest data
      const [allTasks] = await Promise.all([
        taskService.getAllTasks(),
        refreshEvents(),
      ]);
      setTasks(allTasks);
      const map = new Map<string, Task>();
      allTasks.forEach(task => map.set(task.id, task));
      setTasksMap(map);
      setAutoScheduleOpen(true);
    } catch (err) {
      logger.error('Failed to fetch tasks for auto-scheduling:', err);
      toast.error('Failed to load tasks');
    }
  };

  const handleAutoSchedule = async (
    eventsToCreate: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id: string;
      user_id: string;
    }>
  ) => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    try {
      // Refresh events first to ensure we have the latest data
      // This is important because the dialog might have been opened with stale data
      const latestEvents = await refreshEvents();

      // First, delete all non-completed task events
      // Completed events should be preserved
      const nonCompletedTaskEvents = latestEvents.filter(
        event => isCalendarEventTask(event) && !event.completed_at
      );


      // Use batch delete for better performance
      if (nonCompletedTaskEvents.length > 0) {
        const eventIds = nonCompletedTaskEvents.map(e => e.id);
        const deleteResults = await calendarService.deleteCalendarEventsBatch(
          eventIds
        );

        const failedDeletes = deleteResults.filter(r => !r.success);
        if (failedDeletes.length > 0) {
          logger.error(
            `[useAutoSchedule] Failed to delete ${failedDeletes.length} events:`,
            failedDeletes.map(r => ({ id: r.id, error: r.error }))
          );
        }
      }

      // Refresh events again after deletion to ensure we have the latest state
      const eventsAfterDeletion = await refreshEvents();

      // Add a small delay to ensure deletion is fully processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now create the new events
      const results = await calendarService.createCalendarEventsBatch(
        eventsToCreate.map(event => ({
          ...event,
          completed_at: null,
        }))
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const violations = eventsToCreate.filter(event => {
        const task = tasks.find(t => t.id === event.linked_task_id);
        if (!task?.due_date) return false;
        const eventStart = new Date(event.start_time);
        const deadline = new Date(task.due_date);
        deadline.setHours(23, 59, 59, 999);
        return eventStart > deadline;
      }).length;

      // Refresh calendar events
      await refreshEvents();

      // Show detailed summary toast
      if (successful > 0) {
        // Get unique task names that were scheduled
        const scheduledTaskIds = new Set(
          eventsToCreate.map(e => e.linked_task_id)
        );
        const scheduledTaskNames = tasks
          .filter(t => scheduledTaskIds.has(t.id))
          .map(t => t.title)
          .slice(0, 3); // Show up to 3 task names

        const taskSummary =
          scheduledTaskNames.length > 0
            ? scheduledTaskNames.length === scheduledTaskIds.size
              ? scheduledTaskNames.join(', ')
              : `${scheduledTaskNames.join(', ')} and ${scheduledTaskIds.size - scheduledTaskNames.length} more`
            : '';

        toast.success(
          `Created ${successful} event${successful > 1 ? 's' : ''} for ${scheduledTaskIds.size} task${scheduledTaskIds.size > 1 ? 's' : ''}`,
          {
            description: taskSummary || undefined,
            duration: 4000,
          }
        );
      }
      if (failed > 0) {
        toast.error(
          `Failed to create ${failed} event${failed > 1 ? 's' : ''}`,
          {
            description: 'Some events could not be scheduled. Please try again.',
            duration: 5000,
          }
        );
      }
      if (violations > 0) {
        toast.warning(
          `${violations} event${violations > 1 ? 's' : ''} scheduled after deadline`,
          {
            description:
              'Consider extending deadlines or reducing task duration.',
            duration: 6000,
          }
        );
      }

      // Notify parent to refresh task list
      onTaskDropped?.();
    } catch (err) {
      logger.error('Failed to auto-schedule tasks:', err);
      toast.error('Failed to schedule tasks');
    }
  };

  return {
    autoScheduleOpen,
    setAutoScheduleOpen,
    tasks,
    tasksMap,
    handleAutoScheduleClick,
    handleAutoSchedule,
  };
}
