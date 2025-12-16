'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Task, Project, CalendarEventUnion } from '@shared/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { calendarService } from '@/services/calendarService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-3">
      {tasks.map(task => {
        const isPlanned = plannedTaskIds.has(task.id);
        const project = task.project_id ? projectsById[task.project_id] : undefined;
        return (
          <Card
            key={task.id}
            className={`border transition ${
              isPlanned
                ? 'bg-muted/40 text-muted-foreground cursor-default'
                : 'cursor-grab active:cursor-grabbing'
            }`}
            draggable={!isPlanned}
            onDragStart={e => {
              if (isPlanned) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData('application/x-task-id', task.id);
              e.dataTransfer.setData('application/x-task-title', task.title);
              if (task.description) {
                e.dataTransfer.setData('application/x-task-description', task.description);
              }
            }}
            title={isPlanned ? 'Task already scheduled in calendar' : undefined}
          >
            <CardContent className="p-3">
              <div className="min-w-0">
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default CalendarTasksPanel;






