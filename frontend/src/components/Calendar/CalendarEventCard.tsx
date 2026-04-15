'use client';

import { CalendarEventUnion, isCalendarEventTask, type Task } from '@/types';
import { formatEventTime } from '@/utils/calendarUtils';
import { formatDate } from '@/utils/dateUtils';
import { AlertTriangle, CheckCircle2, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  PROJECT_CALENDAR_COLORS,
  DEFAULT_TASK_CALENDAR_COLOR,
  getProjectColorIndex,
} from '@/utils/projectColors';

interface CalendarEventCardProps {
  event: CalendarEventUnion;
  style?: React.CSSProperties;
  task?: Task; // Optional task data for deadline checking
  onResizeMouseDown?: (e: React.MouseEvent) => void;
}

export function CalendarEventCard({
  event,
  style,
  task,
  onResizeMouseDown,
}: CalendarEventCardProps) {
  const isTaskEvent = isCalendarEventTask(event);
  const isCompleted = isTaskEvent && !!event.completed_at;
  const now = new Date();
  const eventEnd = new Date(event.end_time);
  const isPast = eventEnd < now;

  // Check if event is after deadline
  // Set deadline to end of day (23:59:59.999) to allow events on the deadline day
  const isAfterDeadline =
    isTaskEvent &&
    task &&
    task.due_date &&
    (() => {
      const deadline = new Date(task.due_date);
      deadline.setHours(23, 59, 59, 999);
      return new Date(event.start_time) > deadline;
    })();

  const projectColor = (() => {
    if (!isTaskEvent) return null;
    const projectId = task?.project_id;
    if (!projectId) return DEFAULT_TASK_CALENDAR_COLOR;
    return PROJECT_CALENDAR_COLORS[getProjectColorIndex(projectId)];
  })();

  // Background encodes the event type
  const bgClass = isAfterDeadline
    ? 'bg-red-500/80 text-white shadow-sm hover:bg-red-500/90'
    : isTaskEvent
      ? isCompleted
        ? 'bg-sky-500/25 text-sky-900 dark:text-sky-100'
        : 'bg-sky-500/75 text-white shadow-sm hover:bg-sky-500/85'
      : 'bg-slate-500/70 text-white shadow-sm hover:bg-slate-500/80';

  // Border encodes the project
  const borderClass =
    isTaskEvent && projectColor
      ? isCompleted
        ? projectColor.completedBorder
        : projectColor.border
      : '';

  return (
    <div
      className={cn(
        'calendar-event-card group relative h-full overflow-hidden rounded-md cursor-pointer transition-all',
        'text-[10px] leading-tight',
        bgClass,
        borderClass,
        isCompleted && 'opacity-60',
        isPast &&
          !isCompleted &&
          'opacity-20 grayscale dark:opacity-20 dark:grayscale'
      )}
      style={style}
    >
      <div className="p-1.5 h-full flex flex-col">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          <span
            className={cn('font-medium  flex-1', isCompleted && 'line-through')}
          >
            {event.title}
          </span>
          {isTaskEvent && task?.is_manually_pinned && !isCompleted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Pin className="h-2.5 w-2.5 shrink-0 opacity-80 text-amber-300" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manually pinned — auto-schedule won't move this</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isCompleted && (
            <CheckCircle2 className="h-2.5 w-2.5 shrink-0 opacity-70" />
          )}
        </div>

        <div className="text-[9px] opacity-80 whitespace-nowrap truncate">
          {formatEventTime(event.start_time, event.end_time)}
        </div>

        {isTaskEvent && isAfterDeadline && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 mt-0.5 text-[9px] font-medium">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  <span>Past deadline</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Scheduled after deadline (
                  {task?.due_date ? formatDate(task.due_date) : 'unknown'})
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {!isCompleted && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-b"
          onMouseDown={e => {
            e.stopPropagation();
            onResizeMouseDown?.(e);
          }}
        />
      )}
    </div>
  );
}
