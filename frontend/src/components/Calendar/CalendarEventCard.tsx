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
      className={`calendar-event-card h-full overflow-hidden p-2 text-xs cursor-pointer border animate-scale-in ${getEventColor()} ${isCompleted ? 'animate-task-complete' : ''}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs">{getEventIcon()}</span>
            <span
              className={`font-medium truncate ${
                isCompleted ? 'line-through opacity-70' : ''
              }`}
            >
              {event.title}
            </span>
          </div>

          <div className="text-xs opacity-75 mb-1">
            {formatEventTime(event.start_time, event.end_time)}
          </div>

          {event.description && (
            <div className="text-xs opacity-75 truncate">
              {event.description}
            </div>
          )}
        </div>
      </div>

      {isTaskEvent && (
        <div className="mt-1 flex items-center gap-1">
          <Badge
            variant={isCompleted ? 'default' : 'secondary'}
            className="text-xs px-1 py-0"
          >
            {isCompleted ? '✓ Task' : 'Task'}
          </Badge>
          {isAfterDeadline && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="destructive"
                    className="text-xs px-1 py-0 flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    After deadline
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    This event is scheduled after the task deadline (
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
      )}
    </Card>
  );
}
