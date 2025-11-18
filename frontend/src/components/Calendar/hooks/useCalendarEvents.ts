import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarEventUnion } from '@/../../../shared/types';
import { calendarService } from '@/services/calendarService';
import { isSameDay } from '@/utils/calendarUtils';

export function useCalendarEvents(weekDates: Date[]) {
  const [events, setEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create a stable key from the first date of the week to prevent unnecessary re-fetches
  // Extract the date string directly to avoid dependency on array reference
  const weekKey = useMemo(() => {
    if (weekDates.length === 0) return '';
    // Use only the first date (Monday) as the key - if Monday is the same, it's the same week
    const mondayDate = weekDates[0];
    return mondayDate.toISOString().split('T')[0];
  }, [
    weekDates.length > 0 ? weekDates[0].getTime() : 0
  ]);
  
  const weekKeyRef = useRef<string>('');

  const getWeekRangeIso = () => {
    if (weekDates.length === 0) {
      return { startIso: '', endIso: '' };
    }
    const startDate = new Date(weekDates[0]);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(weekDates[6]);
    endDate.setHours(23, 59, 59, 999);
    return {
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
    };
  };

  // Fetch events for the current week
  useEffect(() => {
    // Skip if week hasn't actually changed
    if (weekKeyRef.current === weekKey) {
      return;
    }
    
    weekKeyRef.current = weekKey;
    
    const fetchEvents = async () => {
      try {
        console.log('[useCalendarEvents] Fetching calendar events for week');
        setLoading(true);
        setError(null);

        const { startIso, endIso } = getWeekRangeIso();

        console.log('[useCalendarEvents] Fetching events for date range:', {
          startIso,
          endIso,
          weekKey,
        });

        const weekEvents = await calendarService.getCalendarEventsByDateRange(
          startIso,
          endIso
        );

        console.log('[useCalendarEvents] Fetched calendar events:', {
          count: weekEvents.length,
          events: weekEvents.map(e => ({
            id: e.id,
            title: e.title,
            linked_task_id: e.linked_task_id,
            start_time: e.start_time,
            end_time: e.end_time,
          })),
        });

        setEvents(weekEvents);
      } catch (err) {
        console.error('[useCalendarEvents] Failed to fetch calendar events:', err);
        console.error('[useCalendarEvents] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          error: err,
        });
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar events'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  // Group events by day for easier rendering
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEventUnion[] } = {};

    weekDates.forEach((date, index) => {
      const dayKey = `day-${index}`;
      grouped[dayKey] = events.filter(event =>
        isSameDay(event.start_time, date)
      );
    });

    return grouped;
  }, [events, weekDates]);

  const refreshEvents = async () => {
    const { startIso, endIso } = getWeekRangeIso();
    const weekEvents = await calendarService.getCalendarEventsByDateRange(
      startIso,
      endIso
    );
    setEvents(weekEvents);
    return weekEvents;
  };

  return {
    events,
    setEvents,
    eventsByDay,
    loading,
    error,
    refreshEvents,
    getWeekRangeIso,
  };
}

