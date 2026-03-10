import { Badge } from '@/components/ui/badge';
import type { CalendarEventTask } from '@/types';
import {  formatEventTime } from '@/utils/calendarUtils';
import { formatDate } from '@/utils/dateUtils';

interface LinkedEventsSectionProps {
  events: CalendarEventTask[];
  isLoading: boolean;
  error: string | null;
}

export function LinkedEventsSection({
  events,
  isLoading,
  error,
}: LinkedEventsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {!isLoading && !error && events.length > 0 ? `${events.length} ` : ''}
          Linked calendar events
        </h3>
        {isLoading && (
          <Badge variant="outline" className="text-[10px] uppercase">
            Loading...
          </Badge>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isLoading && !error && events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This task is not linked to any calendar events.
        </p>
      )}
      {events.length > 0 && (
        <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {events.map(event => (
            <li
              key={event.id}
              className="rounded-md border border-muted bg-muted/40 p-3"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {formatDate(event.start_time)}
                      {' - '}
                      {formatEventTime(event.start_time, event.end_time)}
                    </p>
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-[11px]">
                  Linked
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
