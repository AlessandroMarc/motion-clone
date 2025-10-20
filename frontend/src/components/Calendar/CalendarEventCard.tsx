'use client';

import { CalendarEvent } from '@/../../../shared/types';
import { formatEventTime } from '@/utils/calendarUtils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface CalendarEventCardProps {
  event: CalendarEvent;
  style?: React.CSSProperties;
}

export function CalendarEventCard({ event, style }: CalendarEventCardProps) {
  const getEventColor = () => {
    if (event.linked_task_id) {
      return 'bg-blue-100 border-blue-200 text-blue-900 hover:bg-blue-200';
    }
    return 'bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-200';
  };

  const getEventIcon = () => {
    if (event.linked_task_id) return '📋';
    return '📅';
  };

  return (
    <Card
      className={`p-2 text-xs cursor-pointer transition-colors border ${getEventColor()}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs">{getEventIcon()}</span>
            <span className="font-medium truncate">{event.title}</span>
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

      {event.linked_task_id && (
        <div className="mt-1">
          <Badge variant="secondary" className="text-xs px-1 py-0">
            Task
          </Badge>
        </div>
      )}
    </Card>
  );
}
