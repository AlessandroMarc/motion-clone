'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Task, CalendarEventUnion } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCalendarEventTask } from '@/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { cn } from '@/lib/utils';
import { isSameDay } from '@/utils/calendarUtils';
import { formatTimeRange, formatDateLong } from '@/utils/dateUtils';
import { isTaskCompleted, sortTasksByPriority, TASK_COMPLETED_CLASS } from '@/utils/taskUtils';
import { STATUS_CONFIG } from '@/components/Tasks/taskCardConfig';

interface ZenModeViewProps {
  onExit: () => void;
}

export function ZenModeView({ onExit }: ZenModeViewProps) {
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);

  // Get today's date (stable reference)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Fetch today's tasks and events
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const startDate = today.toISOString();
        const endDate = new Date(
          today.getTime() + 24 * 60 * 60 * 1000 - 1
        ).toISOString();

        const [allTasks, allEvents] = await Promise.all([
          taskService.getAllTasks(),
          calendarService.getCalendarEventsByDateRange(startDate, endDate),
        ]);
        setTasks(allTasks);
        setEvents(allEvents);
      } catch (error) {
        console.error('Failed to load zen mode data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [today]);

  // Today's task-linked events (for start/end time display)
  const todayTaskEvents = useMemo(() => {
    const taskEvents: Map<
      string,
      { start_time: Date; end_time: Date }
    > = new Map();
    for (const event of events) {
      if (!isCalendarEventTask(event)) continue;
      const eventDate = new Date(event.start_time);
      if (!isSameDay(eventDate, today)) continue;
      const taskId = (event as { linked_task_id?: string | null })
        .linked_task_id;
      if (!taskId || taskEvents.has(taskId)) continue;
      taskEvents.set(taskId, {
        start_time: new Date(event.start_time),
        end_time: new Date(event.end_time),
      });
    }
    return taskEvents;
  }, [events, today]);

  // Get today's tasks (only tasks that have calendar events scheduled for today), sorted by priority
  const todayTasks = useMemo(() => {
    const todayEventTaskIds = new Set(todayTaskEvents.keys());
    return sortTasksByPriority(
      tasks.filter(task => todayEventTaskIds.has(task.id))
    );
  }, [tasks, todayTaskEvents]);

  const handleToggleComplete = useCallback(async (task: Task) => {
    try {
      const updated = await taskService.setTaskCompleted(
        task,
        !isTaskCompleted(task)
      );
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch {
      // leave UI unchanged on error
    }
  }, []);

  const formattedDate = formatDateLong(today);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-body">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-8">
      {/* Exit button: below mobile header, touch-friendly on small screens */}
      <button
        type="button"
        onClick={onExit}
        className={cn(
          'absolute right-4 z-10 font-body text-sm transition-colors rounded-lg touch-manipulation',
          'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isMobile
            ? 'top-4 min-h-[44px] min-w-[44px] flex items-center justify-center px-3'
            : 'top-4'
        )}
        aria-label="Exit zen mode"
      >
        Exit
      </button>

      {/* Title with today's date */}
      <h1 className="text-4xl md:text-5xl font-title text-foreground mb-12 text-center">
        {formattedDate}
      </h1>

      {/* Today's tasks as bullet points */}
      <div className="w-full max-w-2xl">
        {todayTasks.length === 0 ? (
          <p className="text-center text-muted-foreground font-body text-lg">
            No tasks for today
          </p>
        ) : (
          <ul className="space-y-4 list-none">
            {todayTasks.map(task => {
              const isCompleted = isTaskCompleted(task);
              const statusConfig =
                STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
              const StatusIcon = statusConfig.icon;
              const eventRange = todayTaskEvents.get(task.id);
              const timeLabel = eventRange
                ? formatTimeRange(eventRange.start_time, eventRange.end_time)
                : null;
              return (
                <li key={task.id} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={cn(
                      'shrink-0 rounded-full p-0.5 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      statusConfig.className,
                      isCompleted && 'hover:opacity-90'
                    )}
                    aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <StatusIcon
                      className={cn(
                        'h-6 w-6 md:h-7 md:w-7',
                        task.status === 'in-progress' && 'animate-spin'
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={cn(
                      'flex-1 text-left font-body text-lg md:text-xl transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded',
                      isCompleted ? TASK_COMPLETED_CLASS : 'text-foreground'
                    )}
                  >
                    <span className="block">{task.title}</span>
                    {timeLabel && (
                      <span
                        className={cn(
                          'block text-sm font-normal mt-0.5',
                          isCompleted
                            ? 'text-muted-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {timeLabel}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
