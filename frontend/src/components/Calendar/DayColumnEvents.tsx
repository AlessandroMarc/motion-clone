'use client';

import type { CalendarEventUnion, Task } from '@/types';
import { CalendarEventCard } from './CalendarEventCard';
import { getEventBoxStyle } from './dayColumnLayout';

type LayoutInfo = { column: number; columns: number };
type LayoutMap = Record<string, LayoutInfo>;

interface DayColumnEventsProps {
  dayIndex: number;
  dayEvents: CalendarEventUnion[];
  draggingEventId: string | null;
  dragPreview: CalendarEventUnion | null;
  layoutMap: LayoutMap;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => void;
  tasksMap?: Map<string, Task>;
}

export function DayColumnEvents({
  dayIndex,
  dayEvents,
  draggingEventId,
  dragPreview,
  layoutMap,
  onEventMouseDown,
  tasksMap,
}: DayColumnEventsProps) {
  const renderEventBox = (
    event: CalendarEventUnion,
    isGhost: boolean,
    layout: LayoutInfo | undefined
  ) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    return (
      <div
        key={event.id + (isGhost ? '-ghost' : '')}
        className={`absolute z-10 ${
          draggingEventId === event.id
            ? isGhost
              ? 'opacity-80 cursor-grabbing'
              : 'hidden'
            : ''
        }`}
        style={getEventBoxStyle(start, end, layout)}
        onMouseDown={e => onEventMouseDown(e, event, dayIndex)}
      >
        <CalendarEventCard
          event={event}
          task={
            'linked_task_id' in event && event.linked_task_id
              ? tasksMap?.get(event.linked_task_id)
              : undefined
          }
        />
      </div>
    );
  };

  return (
    <>
      {dayEvents.map(event =>
        draggingEventId === event.id
          ? null
          : renderEventBox(event, false, layoutMap[event.id])
      )}
      {dragPreview
        ? renderEventBox(dragPreview, true, layoutMap[dragPreview.id])
        : null}
    </>
  );
}


