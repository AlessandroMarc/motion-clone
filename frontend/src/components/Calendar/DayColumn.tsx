'use client';

import { CalendarEvent } from '@/../../../shared/types';
import { CalendarEventCard } from './CalendarEventCard';
import { isSameDay } from '@/utils/calendarUtils';

interface DayColumnProps {
  date: Date;
  dayIndex: number;
  dayEvents: CalendarEvent[];
  onGridCellClick: (date: Date, hour: number, minute: number) => void;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEvent,
    eventDayIndex: number
  ) => void;
  draggingEventId: string | null;
  dragPreview: CalendarEvent | null;
  setDayRef: (el: HTMLDivElement | null) => void;
}

const HOUR_PX = 64; // 64px per hour to match time gutter (h-16)

export function DayColumn({
  date,
  dayIndex,
  dayEvents,
  onGridCellClick,
  onEventMouseDown,
  draggingEventId,
  dragPreview,
  setDayRef,
}: DayColumnProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const renderEventBox = (event: CalendarEvent, isGhost: boolean) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const minutesFromMidnight = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);
    const topPx = (minutesFromMidnight / 60) * HOUR_PX;
    const heightPx = (durationMinutes / 60) * HOUR_PX;

    return (
      <div
        key={event.id + (isGhost ? '-ghost' : '')}
        className={`absolute left-1 right-1 z-10 ${
          draggingEventId === event.id ? (isGhost ? 'opacity-80 cursor-grabbing' : 'hidden') : ''
        }`}
        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
        onMouseDown={e => onEventMouseDown(e, event, dayIndex)}
      >
        <CalendarEventCard event={event} />
      </div>
    );
  };

  const previewBelongsHere =
    dragPreview && isSameDay(dragPreview.start_time as Date, date);

  return (
    <div className="bg-background relative" ref={setDayRef}>
      {hours.map(hour => (
        <div key={hour} className="border-b border-border relative">
          {/* top half-hour */}
          <div
            className="h-8 border-b border-border/50 cursor-pointer hover:bg-muted/40"
            onClick={() => onGridCellClick(date, hour, 0)}
          />
          {/* bottom half-hour */}
          <div
            className="h-8 cursor-pointer hover:bg-muted/40"
            onClick={() => onGridCellClick(date, hour, 30)}
          />
        </div>
      ))}

      {/* Render existing events (hide the one being dragged; ghost will show separately) */}
      {dayEvents.map(event =>
        draggingEventId === event.id ? null : renderEventBox(event, false)
      )}

      {/* Render ghost/preview in the column where it currently is */}
      {previewBelongsHere && dragPreview
        ? renderEventBox(dragPreview as CalendarEvent, true)
        : null}
    </div>
  );
}

export default DayColumn;


