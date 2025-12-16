'use client';

import type { CalendarEventUnion, Task } from '@shared/types';
import { isSameDay } from '@/utils/calendarUtils';
import { computeOverlapLayout } from './dayColumnLayout';
import { DayColumnEvents } from './DayColumnEvents';
import { DayColumnGrid } from './DayColumnGrid';

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

export function DayColumn({
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

  const previewBelongsHere =
    dragPreview && isSameDay(dragPreview.start_time as Date, date);

  // Build layout map including drag preview if it belongs here
  const eventsForLayout: CalendarEventUnion[] =
    previewBelongsHere && dragPreview
      ? [...dayEvents, dragPreview]
      : dayEvents;
  const layoutMap = computeOverlapLayout(eventsForLayout);

  return (
    <div
      className="bg-background relative"
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
    </div>
  );
}

export default DayColumn;
