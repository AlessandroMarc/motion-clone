'use client';

import { cn } from '@/lib/utils';
import { useCallback } from 'react';
import DayColumn from './DayColumn';
import TimeColumn from './TimeColumn';
import type { CalendarEventUnion, Task } from '@/types';
import type { FilteredGoogleEvent } from '@/services/googleCalendarService';
import {
  getDayAbbreviation,
  getMonthDay,
  isSameDay,
} from '@/utils/calendarUtils';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Returns true if a recurring reminder task has an occurrence on the given date.
 * Uses recurrence_start_date as anchor and applies pattern + interval.
 */
function reminderOccursOnDate(task: Task, date: Date): boolean {
  const anchor = task.recurrence_start_date
    ? new Date(task.recurrence_start_date)
    : task.due_date;
  if (!anchor) return false;

  const anchorDay = new Date(anchor);
  anchorDay.setHours(0, 0, 0, 0);
  const checkDay = new Date(date);
  checkDay.setHours(0, 0, 0, 0);

  if (checkDay < anchorDay) return false;

  const pattern = task.recurrence_pattern;
  const interval = task.recurrence_interval ?? 1;

  if (pattern === 'daily') {
    const diffDays = Math.round(
      (checkDay.getTime() - anchorDay.getTime()) / 86400000
    );
    return diffDays % interval === 0;
  }
  if (pattern === 'weekly') {
    if (checkDay.getDay() !== anchorDay.getDay()) return false;
    const diffDays = Math.round(
      (checkDay.getTime() - anchorDay.getTime()) / 86400000
    );
    return (diffDays / 7) % interval === 0;
  }
  if (pattern === 'monthly') {
    if (checkDay.getDate() !== anchorDay.getDate()) return false;
    const monthDiff =
      (checkDay.getFullYear() - anchorDay.getFullYear()) * 12 +
      (checkDay.getMonth() - anchorDay.getMonth());
    return monthDiff % interval === 0;
  }
  return false;
}

interface WeekScrollableGridProps {
  weekDates: Date[];
  eventsByDay: { [key: string]: CalendarEventUnion[] };
  allDayEvents?: FilteredGoogleEvent[];
  reminderTasks?: Task[];
  onBannerEventClick?: (event: FilteredGoogleEvent) => void;
  onReminderTaskClick?: (task: Task) => void;
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
  allDayEvents = [],
  reminderTasks = [],
  onBannerEventClick,
  onReminderTaskClick,
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

  // Memoize the ref callback to prevent infinite re-render loops with Radix UI
  const createDayRefCallback = useCallback(
    (dayIndex: number) => (el: HTMLDivElement | null) => {
      setDayRef(dayIndex, el);
    },
    [setDayRef]
  );

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden h-[calc(100vh-120px)] flex flex-col">
      {/* Day Headers */}
      <div
        className={cn(
          'grid border-b border-border/50 shrink-0',
          isMobile ? 'grid-cols-2' : 'grid-cols-8'
        )}
      >
        {/* Time column header */}
        <div className="p-2 text-[10px] font-medium text-muted-foreground/60 text-right pr-3"></div>
        {weekDates.map((date, index) => {
          const isToday = isSameDay(date, today);
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

      {/* All-day events row */}
      <div
        className={cn(
          'grid border-b border-border/50 bg-muted/20 min-h-[32px] shrink-0',
          isMobile ? 'grid-cols-2' : 'grid-cols-8'
        )}
      >
        <div className="p-1 text-[9px] font-medium text-muted-foreground/50 text-right pr-3 flex items-center justify-end uppercase tracking-tighter">
          banner
        </div>
        {weekDates.map((date, index) => {
          const dayAllDayEvents = allDayEvents.filter(ev => {
            const start = startOfDay(new Date(ev.start_time));
            const end = endOfDay(new Date(ev.end_time));
            return date >= start && date <= end;
          });

          const dayReminderTasks = reminderTasks.filter(task => {
            if (task.is_recurring) {
              return reminderOccursOnDate(task, date);
            }
            return task.due_date ? isSameDay(new Date(task.due_date), date) : false;
          });

          return (
            <div
              key={index}
              className="p-1 border-l border-border/20 first:border-l-0 flex flex-col gap-1 overflow-hidden"
            >
              {dayAllDayEvents.map((ev, idx) => {
                const start = new Date(ev.start_time);
                const end = new Date(ev.end_time);
                const timeStr = !ev.isAllDay
                  ? `${start.getHours()}:${start
                      .getMinutes()
                      .toString()
                      .padStart(2, '0')}-${end.getHours()}:${end
                      .getMinutes()
                      .toString()
                      .padStart(2, '0')}`
                  : null;

                return (
                  <button
                    key={ev.id ?? `${date.toISOString()}-${idx}`}
                    type="button"
                    onClick={() => onBannerEventClick?.(ev)}
                    className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800/60 truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors text-left"
                    title={`${ev.title}${timeStr ? ` (${timeStr})` : ''}`}
                  >
                    {timeStr && (
                      <span className="text-[8px] opacity-70 mr-1 font-mono">
                        {timeStr}
                      </span>
                    )}
                    {ev.title}
                  </button>
                );
              })}
              {dayReminderTasks.map(task => (
                <button
                  key={`reminder-${task.id}`}
                  type="button"
                  onClick={() => onReminderTaskClick?.(task)}
                  className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/60 truncate cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors text-left"
                  title={task.title}
                >
                  {task.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Scrollable Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto"
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
                setDayRef={createDayRefCallback(dayIndex)}
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
