'use client';

import {
  CalendarEventUnion,
  isCalendarEventTask,
  type Task,
} from '@shared/types';
import { formatEventTime } from '@/utils/calendarUtils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
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

  const getEventColor = () => {
    if (isTaskEvent) {
      if (isAfterDeadline) {
        return 'bg-red-50 border-red-300 text-red-900 hover:bg-red-100';
      }
      if (isCompleted) {
        return 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100';
      }
      return 'bg-blue-100 border-blue-200 text-blue-900 hover:bg-blue-200';
    }
    return 'bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-200';
  };

  const getEventIcon = () => {
    if (isTaskEvent) return '📋';
    return '📅';
  };

  return (
    <Card
      className={`calendar-event-card h-full overflow-hidden p-1.5 text-[10px] cursor-pointer border rounded-sm animate-scale-in ${getEventColor()} ${isCompleted ? 'animate-task-complete' : ''}`}
      style={style}
    >
      <div className="flex items-start gap-0.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] shrink-0">{getEventIcon()}</span>
            <span
              className={`font-medium truncate leading-tight ${
                isCompleted ? 'line-through opacity-70' : ''
              }`}
            >
              {event.title}
            </span>
          </div>

          <div className="text-[9px] opacity-75 leading-tight">
            {formatEventTime(event.start_time, event.end_time)}
          </div>
        </div>
      </div>

      {isTaskEvent && isAfterDeadline && (
        <div className="mt-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="destructive"
                  className="text-[9px] px-1 py-0 h-4 flex items-center gap-0.5"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Late
                </Badge>
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
        </div>
      )}
    </Card>
  );
}
