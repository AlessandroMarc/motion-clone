'use client';

import { useState, useEffect } from 'react';
import type { CalendarEventUnion, Task } from '@/types';
import { isSameDay } from '@/utils/calendarUtils';
import { computeOverlapLayout } from './dayColumnLayout';
import { DayColumnEvents } from './DayColumnEvents';
import { DayColumnGrid } from './DayColumnGrid';
import { DayColumnEmptyState } from './DayColumnEmptyState';
import { HOUR_PX } from './dayColumnLayout';

interface DayColumnProps {
  date: Date;
  dayIndex: number;
  dayEvents: CalendarEventUnion[];
  onGridCellClick: (date: Date, hour: number, minute: number) => void;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => void;
  draggingEventId: string | null;
  dragPreview: CalendarEventUnion | null;
  setDayRef: (el: HTMLDivElement | null) => void;
  scrollSentinelRef?: React.Ref<HTMLDivElement>;
  sentinelHour?: number;
  onExternalTaskDrop?: (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => void;
  onExternalTaskDragOver?: (
    date: Date,
    hour: number,
    minute: number,
    taskData?: { id: string; title: string; description?: string }
  ) => void;
  tasksMap?: Map<string, Task>;
}

function DayColumn({
  date,
  dayIndex,
  dayEvents,
  onGridCellClick,
  onEventMouseDown,
  draggingEventId,
  dragPreview,
  setDayRef,
  scrollSentinelRef,
  sentinelHour = 13,
  onExternalTaskDrop,
  onExternalTaskDragOver,
  tasksMap,
}: DayColumnProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isToday = isSameDay(date, currentTime);

  // Update current time every minute
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isToday]);

  const previewBelongsHere =
    dragPreview && isSameDay(dragPreview.start_time as Date, date);

  // Build layout map including drag preview if it belongs here
  const eventsForLayout: CalendarEventUnion[] =
    previewBelongsHere && dragPreview ? [...dayEvents, dragPreview] : dayEvents;
  const layoutMap = computeOverlapLayout(eventsForLayout);

  const hasEvents = dayEvents.length > 0 || (previewBelongsHere && dragPreview);

  // Calculate current time position
  const getCurrentTimePosition = () => {
    if (!isToday) return null;
    const now = new Date();
    const minutesFromMidnight = now.getHours() * 60 + now.getMinutes();
    return (minutesFromMidnight / 60) * HOUR_PX;
  };

  const currentTimeTop = getCurrentTimePosition();

  return (
    <div
      className="relative border-r border-border/20 last:border-r-0"
      ref={setDayRef}
      onDragOver={e => {
        if (!onExternalTaskDrop) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <DayColumnGrid
        date={date}
        hours={hours}
        onGridCellClick={onGridCellClick}
        onExternalTaskDrop={onExternalTaskDrop}
        onExternalTaskDragOver={onExternalTaskDragOver}
        scrollSentinelRef={scrollSentinelRef}
        sentinelHour={sentinelHour}
      />

      <DayColumnEvents
        dayIndex={dayIndex}
        dayEvents={dayEvents.filter(ev => ev.id !== draggingEventId)}
        draggingEventId={draggingEventId}
        dragPreview={previewBelongsHere ? dragPreview : null}
        layoutMap={layoutMap}
        onEventMouseDown={onEventMouseDown}
        tasksMap={tasksMap}
      />

      {/* Current time indicator */}
      {isToday && currentTimeTop !== null && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${currentTimeTop}px` }}
        >
          <div className="relative">
            {/* Red line */}
            <div className="absolute left-0 right-0 h-0.5 bg-red-500 dark:bg-red-400" />
            {/* Red circle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 border-2 border-background dark:border-background" />
          </div>
        </div>
      )}

      {!hasEvents && (
        <DayColumnEmptyState date={date} onAddEvent={onGridCellClick} />
      )}
    </div>
  );
}

export default DayColumn;
