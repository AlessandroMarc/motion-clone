import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarEventUnion } from '@/types';
import { calendarService } from '@/services/calendarService';
import { isSameDay } from '@/utils/calendarUtils';

export function useCalendarEvents(weekDates: Date[]) {
  const [events, setEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key for the date range to prevent unnecessary re-fetches (supports 7-day week or N-day mobile range)
  const weekKey = useMemo(() => {
    if (weekDates.length === 0) return '';
    const first = weekDates[0].toISOString().split('T')[0];
    const last = weekDates[weekDates.length - 1].toISOString().split('T')[0];
    return `${first}_${last}`;
  }, [weekDates]);

  const weekKeyRef = useRef<string>('');

  const getWeekRangeIso = () => {
    if (weekDates.length === 0) {
      return { startIso: '', endIso: '' };
    }
    const startDate = new Date(weekDates[0]);
    startDate.setHours(0, 0, 0, 0);
    const lastDate = new Date(weekDates[weekDates.length - 1]);
    lastDate.setHours(23, 59, 59, 999);
    return {
      startIso: startDate.toISOString(),
      endIso: lastDate.toISOString(),
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
        setLoading(true);
        setError(null);

        const { startIso, endIso } = getWeekRangeIso();

        const weekEvents = await calendarService.getCalendarEventsByDateRange(
          startIso,
          endIso
        );

        setEvents(weekEvents);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message.includes('Unable to connect')
              ? err.message
              : 'Failed to load calendar events. Please ensure the backend server is running.'
            : 'Failed to load calendar events';
        // Error is handled via error state - no need to log to console
        // The error will be displayed in the UI via ErrorState component
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Explicitly handle promise rejection to prevent console errors
    fetchEvents().catch(() => {
      // Already handled in try-catch, this prevents unhandled rejection
    });
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
    try {
      setError(null);
      const { startIso, endIso } = getWeekRangeIso();
      const weekEvents = await calendarService.getCalendarEventsByDateRange(
        startIso,
        endIso
      );
      setEvents(weekEvents);
      return weekEvents;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message.includes('Unable to connect')
            ? err.message
            : 'Failed to load calendar events. Please ensure the backend server is running.'
          : 'Failed to load calendar events';
      // Error is handled via error state - no need to log to console
      // Callers will show toast notifications if needed
      setError(errorMessage);
      throw err; // Re-throw so callers can handle if needed
    }
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
