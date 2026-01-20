'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Task, Project, CalendarEventUnion } from '@shared/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { calendarService } from '@/services/calendarService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TaskScheduleDialog } from './TaskScheduleDialog';

interface CalendarTasksPanelProps {
  currentWeekStart: Date;
  refreshTrigger?: number;
}

export function CalendarTasksPanel({ currentWeekStart, refreshTrigger }: CalendarTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [weekEvents, setWeekEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mobile scheduling state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const isMobile = useIsMobile();
  const { user } = useAuth();

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
      console.log('[CalendarTasksPanel] Loading data, refreshTrigger:', refreshTrigger);
      try {
        setLoading(true);
        setError(null);
        const [fetchedTasks, fetchedProjects] = await Promise.all([
          taskService.getAllTasks(),
          projectService.getAllProjects(),
        ]);
        
        console.log('[CalendarTasksPanel] Fetched tasks:', {
          count: fetchedTasks.length,
          taskIds: fetchedTasks.map(t => t.id),
        });
        
        setTasks(fetchedTasks);
        const map: Record<string, Project> = {};
        for (const p of fetchedProjects) map[p.id] = p as Project;
        setProjectsById(map);

        const startDate = weekDates[0].toISOString().split('T')[0];
        const endDate = weekDates[6].toISOString().split('T')[0];
        console.log('[CalendarTasksPanel] Fetching calendar events for date range:', {
          startDate,
          endDate,
        });
        
        const events = await calendarService.getCalendarEventsByDateRange(startDate, endDate);
        
        console.log('[CalendarTasksPanel] Fetched calendar events:', {
          count: events.length,
          events: events.map(e => ({
            id: e.id,
            title: e.title,
            linked_task_id: e.linked_task_id,
          })),
        });
        
        setWeekEvents(events);
      } catch (e) {
        console.error('[CalendarTasksPanel] Error loading data:', e);
        setError(e instanceof Error ? e.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [weekDates, refreshTrigger]);

  const linkedTaskIds = useMemo(
    () =>
      new Set(
        weekEvents
          .filter(ev => !!ev.linked_task_id)
          .map(ev => ev.linked_task_id as string)
      ),
    [weekEvents]
  );
  const plannedTaskIds = linkedTaskIds;

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
      console.error('[CalendarTasksPanel] Failed to schedule task:', err);
      toast.error('Failed to schedule task. Please try again.');
      throw err;
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="h-20 w-full bg-muted animate-pulse rounded" />
        <div className="h-20 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">No tasks to schedule</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.map(task => {
          const isPlanned = plannedTaskIds.has(task.id);
          const project = task.project_id ? projectsById[task.project_id] : undefined;
          const canSchedule = !isPlanned && task.status !== 'completed';
          
          return (
            <Card
              key={task.id}
              className={`border transition ${
                isPlanned
                  ? 'bg-muted/40 text-muted-foreground cursor-default'
                  : isMobile
                    ? 'cursor-pointer active:bg-accent'
                    : 'cursor-grab active:cursor-grabbing'
              }`}
              draggable={!isPlanned && !isMobile}
              onDragStart={e => {
                if (isPlanned || isMobile) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData('application/x-task-id', task.id);
                e.dataTransfer.setData('application/x-task-title', task.title);
                if (task.description) {
                  e.dataTransfer.setData('application/x-task-description', task.description);
                }
              }}
              onClick={() => {
                if (isMobile && canSchedule) {
                  handleOpenScheduleDialog(task);
                }
              }}
              title={
                isPlanned
                  ? 'Task already scheduled in calendar'
                  : isMobile
                    ? 'Tap to schedule'
                    : 'Drag to calendar to schedule'
              }
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{task.title}</div>
                    {task.description ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {task.description}
                      </div>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5">
                        {task.status}
                      </span>
                      {project ? (
                        <span className="truncate">Project: {project.name}</span>
                      ) : null}
                      {isPlanned && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          Planned
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Schedule button - always visible on mobile, hidden on desktop */}
                  {canSchedule && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`shrink-0 ${isMobile ? 'h-11 w-11 min-h-[44px] min-w-[44px]' : 'h-8 w-8 hidden group-hover:flex'}`}
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenScheduleDialog(task);
                      }}
                      title="Schedule task"
                    >
                      <CalendarPlus className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TaskScheduleDialog
        task={selectedTask}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={handleScheduleTask}
      />
    </>
  );
}

export default CalendarTasksPanel;






