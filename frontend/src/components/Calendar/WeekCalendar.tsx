'use client';

import { useState, useEffect, useMemo } from 'react';
import { CalendarEvent } from '@/../../../shared/types';
import { calendarService } from '@/services/calendarService';
import {
  getWeekDates,
  formatTimeSlot,
  getEventPosition,
  isSameDay,
} from '@/utils/calendarUtils';
import { CalendarHeader, CalendarGridHeader } from './CalendarHeader';
import { CalendarEventCard } from './CalendarEventCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';

export function WeekCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <div key={dayIndex} className="bg-background relative">
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b border-border relative"
                  />
                ))}

                {/* Render events for this day */}
                {dayEvents.map(event => {
                  const position = getEventPosition(event, weekDates);
                  if (!position) return null;

                  // Only render if this event belongs to this day column
                  if (position.column !== dayIndex + 1) return null;

                  const top = `${(position.row - 1) * 4}rem`; // 4rem = 64px per hour
                  const height = `${position.rowSpan * 4}rem`;

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 z-10"
                      style={{
                        top,
                        height,
                      }}
                    >
                      <CalendarEventCard event={event} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
