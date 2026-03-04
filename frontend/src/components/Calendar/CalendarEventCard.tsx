'use client';

import { CalendarEventUnion, isCalendarEventTask, type Task } from '@/types';
import { formatEventTime } from '@/utils/calendarUtils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalendarEventCardProps {
  event: CalendarEventUnion;
  style?: React.CSSProperties;
  task?: Task; // Optional task data for deadline checking
}

export function CalendarEventCard({
  event,
  style,
  task,
}: CalendarEventCardProps) {
  const isTaskEvent = isCalendarEventTask(event);
  const isCompleted = isTaskEvent && !!event.completed_at;
  const isRecurring = isTaskEvent && task?.is_recurring;
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

  return (
    <div
      className={cn(
        'calendar-event-card h-full overflow-hidden rounded-md cursor-pointer transition-all',
        'text-[10px] leading-tight',
        // Color per event type for easy visual distinction
        isTaskEvent
          ? isAfterDeadline
            ? 'bg-red-500/80 text-white shadow-sm hover:bg-red-500/90'
            : isRecurring
              ? isCompleted
                ? 'bg-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-emerald-500/75 text-white shadow-sm hover:bg-emerald-500/85'
              : isCompleted
                ? 'bg-sky-500/30 text-sky-800 dark:text-sky-200'
                : 'bg-sky-500/75 text-white shadow-sm hover:bg-sky-500/85'
          : // External (Google Calendar) events
            'bg-violet-500/70 text-white shadow-sm hover:bg-violet-500/80',
        isCompleted && 'opacity-60',
        // Grey out past events
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
                  {task?.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : 'unknown'}
                  )
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
