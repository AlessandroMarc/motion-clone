'use client';

import { cn } from '@/lib/utils';
import DayColumn from './DayColumn';
import TimeColumn from './TimeColumn';
import type { CalendarEventUnion, Task } from '@/types';
import { getDayAbbreviation, getMonthDay } from '@/utils/calendarUtils';

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
  onExternalTaskDrop?: (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => void;
  onExternalTaskDragOver?: (date: Date, hour: number, minute: number) => void;
  tasksMap?: Map<string, Task>;
  isMobile?: boolean;
  workingHoursStart?: number;
  workingHoursEnd?: number;
}

function WeekScrollableGrid({
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
  workingHoursStart,
  workingHoursEnd,
}: WeekScrollableGridProps) {
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden h-[calc(100vh-120px)]">
      {/* Day Headers */}
      <div
        className={cn(
          'grid border-b border-border/50',
          isMobile ? 'grid-cols-2' : 'grid-cols-8'
        )}
      >
        {/* Time column header */}
        <div className="p-2 text-[10px] font-medium text-muted-foreground/60 text-right pr-3"></div>
        {weekDates.map((date, index) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <div key={index} className="p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                {getDayAbbreviation(date)}
              </div>
              <div
                className={cn(
                  'text-sm font-semibold mt-0.5',
                  isToday && 'text-primary'
                )}
              >
                {getMonthDay(date)}
                {isToday && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable Grid */}
      <div
        ref={gridRef}
        className="h-[calc(100%-60px)] overflow-y-auto"
        onDragOver={e => {
          if (onExternalTaskDrop) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          className={cn('grid', isMobile ? 'grid-cols-2' : 'grid-cols-8')}
          onDragOver={e => {
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
                scrollSentinelRef={
                  dayIndex === 0 ? (scrollSentinelRef ?? undefined) : undefined
                }
                sentinelHour={sentinelHour}
                onExternalTaskDrop={
                  onExternalTaskDrop
                    ? (task, date, hour, minute) => {
                        onExternalTaskDrop(task, date, hour, minute);
                      }
                    : undefined
                }
                onExternalTaskDragOver={onExternalTaskDragOver}
                tasksMap={tasksMap}
                workingHoursStart={workingHoursStart}
                workingHoursEnd={workingHoursEnd}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeekScrollableGrid;
