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
import { TaskCompletionDot } from '@/components/Tasks/TaskCompletionDot';
import { TaskEditDialogForm } from '@/components/Tasks/forms/TaskEditDialogForm';
import CalendarEditDialog from '@/components/Calendar/CalendarEditDialog';
import { Calendar } from 'lucide-react';

function ZenTaskItem({
  task,
  startTime,
  endTime,
  onToggleComplete,
  onRowClick,
}: {
  task: Task;
  startTime: Date;
  endTime: Date;
  onToggleComplete: (task: Task, nextCompleted: boolean) => Promise<void>;
  onRowClick: () => void;
}) {
  const [isPreviewingComplete, setIsPreviewingComplete] = useState(false);
  const isCompleted = isTaskCompleted(task);
  const timeLabel = formatTimeRange(startTime, endTime);

  return (
    <li className="flex items-start gap-3">
      <TaskCompletionDot
        completed={isCompleted}
        onToggle={nextCompleted => onToggleComplete(task, nextCompleted)}
        onPreviewChange={setIsPreviewingComplete}
        iconClassName="h-6 w-6 md:h-7 md:w-7"
      />
      <button
        type="button"
        onClick={onRowClick}
        className={cn(
          'flex-1 text-left font-body text-lg md:text-xl transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded',
          isCompleted || isPreviewingComplete
            ? TASK_COMPLETED_CLASS
            : 'text-foreground'
        )}
      >
        <span className="block">{task.title}</span>
        <span
          className={cn(
            'block text-sm font-normal mt-0.5',
            isCompleted ? 'text-muted-foreground/80' : 'text-muted-foreground'
          )}
        >
          {timeLabel}
        </span>
      </button>
    </li>
  );
}

interface ZenModeViewProps {
  onExit: () => void;
}

export function ZenModeView({ onExit }: ZenModeViewProps) {
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDialogItem, setCalendarDialogItem] = useState<{
    task: Task;
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [taskEditTask, setTaskEditTask] = useState<Task | null>(null);

  // Get today's date (stable reference)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Fetch tasks and events for the next 4 days (today + 3 days)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const startDate = today.toISOString();
        const endDate = new Date(
          today.getTime() + 4 * 24 * 60 * 60 * 1000
        ).toISOString();

        const [allTasks, allEvents] = await Promise.all([
          taskService.getAllTasks(),
          calendarService.getCalendarEventsByDateRange(startDate, endDate),
        ]);

        console.log('ZenModeView loaded tasks:', allTasks);
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

  // Task-linked events for all 4 days (grouped by task ID, keeping first occurrence per task per day)
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks) {
      map.set(task.id, task);
    }
    return map;
  }, [tasks]);

  // Build a unified timeline: tasks (with their scheduled time) + regular events, sorted by start_time
  type TimelineTask = {
    kind: 'task';
    task: Task;
    taskEventId: string;
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

  interface DaySchedule {
    date: Date;
    items: TimelineItem[];
  }

  const daySchedules = useMemo((): DaySchedule[] => {
    // Build day schedules for the next 4 days
    const schedules: DaySchedule[] = [];
    for (let i = 0; i < 4; i++) {
      const dayDate = new Date(today);
      dayDate.setDate(dayDate.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      const timestamp = dayDate.getTime();

      const dayItems: TimelineItem[] = [];

      // Process all events for this day
      for (const event of events) {
        const eventDate = new Date(event.start_time);
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate.getTime() !== timestamp) continue;

        if (isCalendarEventTask(event)) {
          // Task-linked event: find the task and add it
          const taskId = (event as { linked_task_id?: string | null })
            .linked_task_id;
          if (taskId) {
            const task = taskMap.get(taskId);
            if (task) {
              dayItems.push({
                kind: 'task',
                task,
                taskEventId: event.id,
                startTime: new Date(event.start_time),
                endTime: new Date(event.end_time),
              });
            }
          }
        } else {
          // Regular calendar event
          dayItems.push({
            kind: 'event',
            event: event as CalendarEvent,
            startTime: new Date(event.start_time),
            endTime: new Date(event.end_time),
          });
        }
      }

      // Sort items within this day by start time
      dayItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      schedules.push({
        date: dayDate,
        items: dayItems,
      });
    }

    return schedules;
  }, [events, taskMap, today]);

  const handleToggleComplete = useCallback(
    async (task: Task, nextCompleted: boolean) => {
      try {
        const updated = await taskService.setTaskCompleted(task, nextCompleted);
        setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } catch {
        // leave UI unchanged on error
      }
    },
    []
  );

  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    setTasks(prev =>
      prev.map(t => (t.id === updatedTask.id ? updatedTask : t))
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-body">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col p-8">
      {/* Exit button: above content, fixed position */}
      <button
        type="button"
        onClick={onExit}
        className={cn(
          'absolute right-4 top-4 z-10 font-body text-sm transition-colors rounded-lg touch-manipulation',
          'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isMobile
            ? 'min-h-[44px] min-w-[44px] flex items-center justify-center px-3'
            : ''
        )}
        aria-label="Exit zen mode"
      >
        Exit
      </button>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pt-12 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          {daySchedules.map(daySchedule => {
            const dayFormatted = formatDateLong(daySchedule.date);
            const isToday = isSameDay(daySchedule.date, today);

            return (
              <section key={daySchedule.date.toISOString()} className="mb-12">
                {/* Day heading */}
                <h2
                  className={cn(
                    'text-3xl md:text-4xl font-title mb-8',
                    isToday ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {dayFormatted}
                </h2>

                {/* Items for this day */}
                {daySchedule.items.length === 0 ? (
                  <p className="text-muted-foreground font-body text-lg">
                    Nothing scheduled
                  </p>
                ) : (
                  <ul className="space-y-4 list-none">
                    {daySchedule.items.map(item => {
                      if (item.kind === 'task') {
                        const { task, taskEventId, startTime, endTime } = item;
                        return (
                          <ZenTaskItem
                            key={taskEventId}
                            task={task}
                            startTime={startTime}
                            endTime={endTime}
                            onToggleComplete={handleToggleComplete}
                            onRowClick={() =>
                              setCalendarDialogItem({ task, startTime, endTime })
                            }
                          />
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
              </section>
            );
          })}
        </div>
      </div>

      {calendarDialogItem && (
        <CalendarEditDialog
          open={true}
          onOpenChange={(open: boolean) => {
            if (!open) setCalendarDialogItem(null);
          }}
          title={calendarDialogItem.task.title}
          description={calendarDialogItem.task.description ?? ''}
          startTime={calendarDialogItem.startTime.toISOString()}
          endTime={calendarDialogItem.endTime.toISOString()}
          isTaskEvent={true}
          completed={isTaskCompleted(calendarDialogItem.task)}
          onCompletedChange={(nextCompleted: boolean) =>
            handleToggleComplete(calendarDialogItem.task, nextCompleted)
          }
          onLinkClick={() => {
            const task = calendarDialogItem.task;
            setCalendarDialogItem(null);
            setTaskEditTask(task);
          }}
        />
      )}
      <TaskEditDialogForm
        task={taskEditTask}
        open={taskEditTask !== null}
        onOpenChange={open => {
          if (!open) setTaskEditTask(null);
        }}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
}
