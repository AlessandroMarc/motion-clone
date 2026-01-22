'use client';

import {
  CalendarEventUnion,
  isCalendarEventTask,
  type Task,
} from '@shared/types';
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

  // Check if event is after deadline
  const isAfterDeadline =
    isTaskEvent &&
    task &&
    task.due_date &&
    new Date(event.start_time) > new Date(task.due_date);

  return (
    <div
      className={cn(
        'calendar-event-card h-full overflow-hidden rounded-md cursor-pointer transition-all',
        'text-[10px] leading-tight',
        // Base styles - using primary color like the landing page demo
        isTaskEvent
          ? isAfterDeadline
            ? 'bg-red-500/80 text-white shadow-sm'
            : isCompleted
              ? 'bg-primary/40 text-primary-foreground/70'
              : 'bg-primary/70 text-primary-foreground shadow-sm hover:bg-primary/80'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        isCompleted && 'opacity-60'
      )}
      style={style}
    >
      <div className="p-1.5 h-full flex flex-col">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          <span
            className={cn(
              'font-medium truncate flex-1',
              isCompleted && 'line-through'
            )}
          >
            {event.title}
          </span>
          {isCompleted && (
            <CheckCircle2 className="h-2.5 w-2.5 shrink-0 opacity-70" />
          )}
        </div>

        <div className="text-[9px] opacity-80 mt-0.5">
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
