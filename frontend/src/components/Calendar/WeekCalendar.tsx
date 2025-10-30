'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarEvent } from '@/../../../shared/types';
import { calendarService } from '@/services/calendarService';
import {
  getWeekDates,
  formatTimeSlot,
  getEventPosition,
  isSameDay,
} from '@/utils/calendarUtils';
import { CalendarHeader, CalendarGridHeader } from './CalendarHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import CalendarCreateDialog from './CalendarCreateDialog';
import DayColumn from './DayColumn';

export function WeekCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<CalendarEvent | null>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    originalStart: Date;
    originalEnd: Date;
    originalDayIndex: number;
    durationMs: number;
  } | null>(null);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Fetch events for the current week
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const startDate = weekDates[0].toISOString().split('T')[0];
        const endDate = weekDates[6].toISOString().split('T')[0];

        const weekEvents = await calendarService.getCalendarEventsByDateRange(
          startDate,
          endDate
        );

        setEvents(weekEvents);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar events'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [weekDates]);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Group events by day for easier rendering
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};

    weekDates.forEach((date, index) => {
      const dayKey = `day-${index}`;
      grouped[dayKey] = events.filter(event =>
        isSameDay(event.start_time, date)
      );
    });

    return grouped;
  }, [events, weekDates]);

  // Generate time slots (0-23 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const onGridCellClick = (date: Date, hour: number, minute: number) => {
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    setTitle('');
    setDescription('');
    setStartTime(toLocalInputValue(start));
    setEndTime(toLocalInputValue(end));
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();
      await calendarService.createCalendarEvent({
        title,
        start_time: startIso,
        end_time: endIso,
        description: description || undefined,
      } as any);

      // Refresh current week events
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const weekEvents = await calendarService.getCalendarEventsByDateRange(
        startDate,
        endDate
      );
      setEvents(weekEvents);
      setCreateOpen(false);
    } catch (err) {
      console.error('Failed to create calendar event:', err);
      // Optionally set error UI
    }
  };

  // Drag & drop handlers
  const onEventMouseDown = (
    e: React.MouseEvent,
    event: CalendarEvent,
    eventDayIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingEventId(event.id);
    dragStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      originalStart: new Date(event.start_time),
      originalEnd: new Date(event.end_time),
      originalDayIndex: eventDayIndex,
      durationMs: new Date(event.end_time).getTime() - new Date(event.start_time).getTime(),
    };

    setDragPreview(event);
  };

  useEffect(() => {
    if (!draggingEventId) return;

    const hourHeight = 64; // px
    const minutesPerPixel = 60 / hourHeight;
    const snapMinutes = 30; // snap to 30 minutes

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      // Determine which day column we're over
      let targetDayIndex = state.originalDayIndex;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const el = dayRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          targetDayIndex = i;
          break;
        }
      }

      // Vertical movement -> minutes delta
      const deltaY = e.clientY - state.startClientY;
      const deltaMinutesRaw = deltaY * minutesPerPixel;
      const deltaMinutes = Math.round(deltaMinutesRaw / snapMinutes) * snapMinutes;

      const baseStart = new Date(state.originalStart);
      // Adjust base to same time on target day
      const baseDayDate = new Date(weekDates[targetDayIndex]);
      baseDayDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);

      const newStart = new Date(baseDayDate.getTime() + deltaMinutes * 60 * 1000);
      const newEnd = new Date(newStart.getTime() + state.durationMs);

      setDragPreview(prev =>
        prev
          ? {
              ...prev,
              start_time: newStart,
              end_time: newEnd,
            }
          : prev
      );
    };

    const handleMouseUp = async () => {
      const state = dragStateRef.current;
      const preview = dragPreview;
      setDraggingEventId(null);
      dragStateRef.current = null;

      if (!state || !preview) {
        setDragPreview(null);
        return;
      }

      // Persist update
      try {
        await calendarService.updateCalendarEvent(preview.id, {
          start_time: (preview.start_time as Date).toISOString(),
          end_time: (preview.end_time as Date).toISOString(),
        } as any);

        // Optimistically update local state
        setEvents(curr =>
          curr.map(ev =>
            ev.id === preview.id
              ? {
                  ...ev,
                  start_time: new Date(preview.start_time),
                  end_time: new Date(preview.end_time),
                }
              : ev
          )
        );
      } catch (err) {
        console.error('Failed to update calendar event:', err);
        // Optionally: revert UI by doing nothing (state remains old)
      } finally {
        setDragPreview(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp as any);
    };
  }, [draggingEventId, dragPreview, weekDates]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        weekDates={weekDates}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
      />

      <div className="border rounded-lg overflow-hidden">
        <CalendarGridHeader weekDates={weekDates} />

        <div className="grid grid-cols-8 gap-px bg-border">
          {/* Time column */}
          <div className="bg-background">
            {timeSlots.map(hour => (
              <div
                key={hour}
                className="h-16 border-b border-border flex items-start justify-end pr-3 pt-1"
              >
                <span className="text-xs text-muted-foreground">
                  {formatTimeSlot(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
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
                setDayRef={el => (dayRefs.current[dayIndex] = el)}
              />
            );
          })}
        </div>
      </div>
      <CalendarCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        onCreate={handleCreate}
      />
    </div>
  );
}
