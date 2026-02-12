'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Task, CalendarEvent, CalendarEventUnion } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCalendarEventTask } from '@/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { cn } from '@/lib/utils';
import { isSameDay } from '@/utils/calendarUtils';
import { formatTimeRange, formatDateLong } from '@/utils/dateUtils';
import { isTaskCompleted, TASK_COMPLETED_CLASS } from '@/utils/taskUtils';
import { STATUS_CONFIG } from '@/components/Tasks/taskCardConfig';
import { Calendar } from 'lucide-react';

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
    const taskEvents: Map<string, { start_time: Date; end_time: Date }> =
      new Map();
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

  // Build a unified timeline: tasks (with their scheduled time) + regular events, sorted by start_time
  type TimelineTask = {
    kind: 'task';
    task: Task;
    startTime: Date;
    endTime: Date;
  };
  type TimelineEvent = {
    kind: 'event';
    event: CalendarEvent;
    startTime: Date;
    endTime: Date;
  };
  type TimelineItem = TimelineTask | TimelineEvent;

  const timeline = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Tasks that have a calendar event scheduled for today
    const todayEventTaskIds = new Set(todayTaskEvents.keys());
    for (const task of tasks) {
      const range = todayTaskEvents.get(task.id);
      if (!todayEventTaskIds.has(task.id) || !range) continue;
      items.push({
        kind: 'task',
        task,
        startTime: range.start_time,
        endTime: range.end_time,
      });
    }

    // Regular (non-task) calendar events for today
    for (const event of events) {
      if (isCalendarEventTask(event)) continue;
      if (!isSameDay(new Date(event.start_time), today)) continue;
      items.push({
        kind: 'event',
        event: event as CalendarEvent,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
      });
    }

    // Sort everything by start time
    items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return items;
  }, [tasks, events, todayTaskEvents, today]);

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

      {/* Today's schedule: tasks + calendar events sorted by start time */}
      <div className="w-full max-w-2xl">
        {timeline.length === 0 ? (
          <p className="text-center text-muted-foreground font-body text-lg">
            Nothing scheduled for today
          </p>
        ) : (
          <ul className="space-y-4 list-none">
            {timeline.map(item => {
              if (item.kind === 'task') {
                const { task, startTime, endTime } = item;
                const isCompleted = isTaskCompleted(task);
                const statusConfig =
                  STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
                const StatusIcon = statusConfig.icon;
                const timeLabel = formatTimeRange(startTime, endTime);
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
                      aria-label={
                        isCompleted ? 'Mark incomplete' : 'Mark complete'
                      }
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
                    </button>
                  </li>
                );
              }

              // Regular calendar event
              const { event, startTime, endTime } = item;
              const isPast = endTime < new Date();
              const timeLabel = formatTimeRange(startTime, endTime);
              return (
                <li
                  key={event.id}
                  className={cn(
                    'flex items-start gap-3',
                    isPast && 'opacity-50'
                  )}
                >
                  <span className="shrink-0 rounded-full p-0.5 text-muted-foreground">
                    <Calendar className="h-6 w-6 md:h-7 md:w-7" />
                  </span>
                  <div className="flex-1 font-body text-lg md:text-xl text-foreground">
                    <span className="block">{event.title}</span>
                    <span className="block text-sm font-normal mt-0.5 text-muted-foreground">
                      {timeLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
