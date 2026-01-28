'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Task, Project, CalendarEventUnion } from '@/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { calendarService } from '@/services/calendarService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TaskScheduleDialog } from './TaskScheduleDialog';
import { CompactTaskCard } from './CompactTaskCard';

interface CalendarTasksPanelProps {
  currentWeekStart: Date;
  refreshTrigger?: number;
}

export function CalendarTasksPanel({
  currentWeekStart,
  refreshTrigger,
}: CalendarTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [weekEvents, setWeekEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile scheduling state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isMobile = useIsMobile();
  const { user, activeSchedule } = useAuth();

  const weekDates = useMemo(() => {
    const start = new Date(currentWeekStart);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return dates;
  }, [currentWeekStart]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [fetchedTasks, fetchedProjects] = await Promise.all([
          taskService.getAllTasks(),
          projectService.getAllProjects(),
        ]);

        setTasks(fetchedTasks);
        const map: Record<string, Project> = {};
        for (const p of fetchedProjects) map[p.id] = p as Project;
        setProjectsById(map);

        const startDate = weekDates[0].toISOString().split('T')[0];
        const endDate = weekDates[6].toISOString().split('T')[0];
        const events = await calendarService.getCalendarEventsByDateRange(
          startDate,
          endDate
        );
        setWeekEvents(events);
      } catch (e) {
        const errorMessage =
          e instanceof Error
            ? e.message.includes('Unable to connect')
              ? e.message
              : 'Failed to load tasks. Please ensure the backend server is running.'
            : 'Failed to load tasks';
        // Error is handled via error state and displayed in UI - no need to log to console
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    // Explicitly handle promise rejection to prevent console errors
    load().catch(() => {
      // Already handled in try-catch, this prevents unhandled rejection
    });
  }, [weekDates, refreshTrigger]);

  const plannedTaskIds = useMemo(
    () =>
      new Set(
        weekEvents
          .filter(ev => !!ev.linked_task_id)
          .map(ev => ev.linked_task_id as string)
      ),
    [weekEvents]
  );

  const handleOpenScheduleDialog = (task: Task) => {
    setSelectedTask(task);
    setScheduleDialogOpen(true);
  };

  const handleScheduleTask = async (
    task: Task,
    startTime: Date,
    endTime: Date
  ) => {
    if (!user) {
      toast.error('You must be logged in to schedule tasks');
      return;
    }

    try {
      await calendarService.createCalendarEvent({
        title: task.title,
        description: task.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        linked_task_id: task.id,
        user_id: user.id,
        completed_at: null,
      });

      toast.success(`"${task.title}" added to calendar`);

      // Refresh the events to update the planned status
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const events = await calendarService.getCalendarEventsByDateRange(
        startDate,
        endDate
      );
      setWeekEvents(events);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message.includes('Unable to connect')
            ? err.message
            : 'Failed to schedule task. Please ensure the backend server is running.'
          : 'Failed to schedule task. Please try again.';
      if (process.env.NODE_ENV === 'development') {
        console.error('[CalendarTasksPanel] Failed to schedule task:', err);
      }
      toast.error(errorMessage);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-12 w-full bg-muted animate-pulse rounded-md"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 bg-destructive/10 rounded-md">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center bg-muted/30 rounded-md">
        No tasks to schedule
      </div>
    );
  }

  // Filter out planned tasks - only show unplanned tasks in the drawer
  const unplannedTasks = tasks.filter(task => !plannedTaskIds.has(task.id));

  if (unplannedTasks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center bg-muted/30 rounded-md">
        No unplanned tasks to schedule
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {unplannedTasks.map(task => {
          const project = task.project_id
            ? projectsById[task.project_id]
            : undefined;
          const canDrag = !isMobile && task.status !== 'completed';

          return (
            <CompactTaskCard
              key={task.id}
              task={task}
              isPlanned={false}
              project={project}
              showDragHandle={canDrag}
              draggable={canDrag}
              disabled={false}
              onDragStart={e => {
                e.dataTransfer.setData('application/x-task-id', task.id);
                e.dataTransfer.setData('application/x-task-title', task.title);
                if (task.description) {
                  e.dataTransfer.setData(
                    'application/x-task-description',
                    task.description
                  );
                }
              }}
              onSchedule={handleOpenScheduleDialog}
              onSelect={isMobile ? handleOpenScheduleDialog : undefined}
            />
          );
        })}
      </div>

      <TaskScheduleDialog
        task={selectedTask}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={handleScheduleTask}
        activeSchedule={activeSchedule}
      />
    </>
  );
}

export default CalendarTasksPanel;
