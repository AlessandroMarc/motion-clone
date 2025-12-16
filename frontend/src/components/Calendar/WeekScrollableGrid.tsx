'use client';

import { cn } from '@/lib/utils';
import DayColumn from './DayColumn';
import TimeColumn from './TimeColumn';
import type { CalendarEventUnion, Task } from '@shared/types';

interface WeekScrollableGridProps {
  weekDates: Date[];
  eventsByDay: { [key: string]: CalendarEventUnion[] };
  onGridCellClick: (date: Date, hour: number, minute: number) => void;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => void;
  draggingEventId: string | null;
  dragPreview: CalendarEventUnion | null;
  setDayRef: (dayIndex: number, el: HTMLDivElement | null) => void;
  gridRef: React.Ref<HTMLDivElement>;
  scrollSentinelRef: React.Ref<HTMLDivElement> | null;
  sentinelHour?: number;
  onExternalTaskDrop?: (task: { id: string; title: string; description?: string }, date: Date, hour: number, minute: number) => void;
  onExternalTaskDragOver?: (date: Date, hour: number, minute: number) => void;
  tasksMap?: Map<string, Task>;
  isMobile?: boolean;
}

export function WeekScrollableGrid({
  weekDates,
  eventsByDay,
  onGridCellClick,
  onEventMouseDown,
  draggingEventId,
  dragPreview,
  setDayRef,
  gridRef,
  scrollSentinelRef,
  sentinelHour = 13,
  onExternalTaskDrop,
  onExternalTaskDragOver,
  tasksMap,
  isMobile = false,
}: WeekScrollableGridProps) {
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="border rounded-lg overflow-hidden h-[calc(100vh-100px)] md:h-[calc(100vh-100px)]">
      <div className={cn(
        "grid gap-px bg-border rounded-t-lg overflow-hidden",
        isMobile ? "grid-cols-2" : "grid-cols-8"
      )}>
        {/* Time column header */}
        <div className="bg-muted p-3 text-sm font-medium text-muted-foreground">
          Time
        </div>
        {weekDates.map((_, index) => (
          <div key={index} className="bg-muted p-3">
            {isMobile && (
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground">
                  {weekDates[index].toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-sm font-semibold">
                  {weekDates[index].toLocaleDateString('en-US', { day: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div 
        ref={gridRef} 
        className="h-full overflow-y-auto w-full"
        onDragOver={e => {
          console.log('[WeekScrollableGrid] onDragOver on grid container');
          if (onExternalTaskDrop) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div 
          className={cn(
            "grid gap-px bg-border w-full",
            isMobile ? "grid-cols-2" : "grid-cols-8"
          )}
          onDragOver={e => {
            console.log('[WeekScrollableGrid] onDragOver on grid inner div');
            if (onExternalTaskDrop) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <TimeColumn hours={timeSlots} />
          {weekDates.map((date, dayIndex) => {
            const dayKey = `day-${dayIndex}`;
            const dayEvents = eventsByDay[dayKey] || [];
            return (
              <DayColumn
                key={dayIndex}
                date={date}
                dayIndex={dayIndex}
                dayEvents={dayEvents}
                onGridCellClick={onGridCellClick}
                onEventMouseDown={onEventMouseDown}
                draggingEventId={draggingEventId}
                dragPreview={dragPreview}
                setDayRef={el => setDayRef(dayIndex, el)}
                scrollSentinelRef={dayIndex === 0 ? scrollSentinelRef ?? undefined : undefined}
                sentinelHour={sentinelHour}
                onExternalTaskDrop={onExternalTaskDrop ? (task, date, hour, minute) => {
                  console.log('[WeekScrollableGrid] Forwarding onExternalTaskDrop to DayColumn:', {
                    task,
                    date: date.toISOString(),
                    hour,
                    minute,
                  });
                  onExternalTaskDrop(task, date, hour, minute);
                } : undefined}
                onExternalTaskDragOver={onExternalTaskDragOver}
                tasksMap={tasksMap}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeekScrollableGrid;


