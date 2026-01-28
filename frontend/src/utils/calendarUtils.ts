import type { CalendarEventUnion } from '@/types';

/**
 * Get a sequential range of dates starting from the given date
 */
export function getDateRange(startDate: Date, numDays: number): Date[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Get array of dates for the week containing the given date
 * Week starts on Monday (ISO 8601 standard)
 */
export function getWeekDates(date: Date): Date[] {
  const weekDates: Date[] = [];
  const startOfWeek = new Date(date);

  // Get Monday of the week
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Generate 7 days starting from Monday
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    weekDates.push(dayDate);
  }

  return weekDates;
}

/**
 * Format hour number to display string (e.g., 9 -> "9:00 AM")
 */
export function formatTimeSlot(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

/**
 * Calculate grid position for an event
 * Returns { row, rowSpan, column } where:
 * - row: 1-based row number (1-24 for hours 0-23)
 * - rowSpan: number of rows the event spans
 * - column: 1-based column number (1-7 for Monday-Sunday)
 */
export function getEventPosition(
  event: CalendarEventUnion,
  weekDates: Date[]
): { row: number; rowSpan: number; column: number } | null {
  const eventDate = new Date(event.start_time);
  const eventDay = eventDate.getDay();

  // Convert Sunday (0) to 7, Monday (1) to 1, etc.
  const dayOfWeek = eventDay === 0 ? 7 : eventDay;

  // Check if event is within the current week
  const weekStart = weekDates[0];
  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  if (eventDate < weekStart || eventDate > weekEnd) {
    return null;
  }

  // Calculate row based on start time (30-minute granularity; 48 rows)
  const startHour = event.start_time.getHours();
  const startMinute = event.start_time.getMinutes();
  const halfIndex = startMinute >= 30 ? 2 : 1;
  const row = startHour * 2 + halfIndex; // 1-based indexing across 48 rows

  // Calculate row span based on duration (30-minute increments)
  const endHour = event.end_time.getHours();
  const endMinute = event.end_time.getMinutes();
  const durationMinutes =
    (endHour - startHour) * 60 + (endMinute - startMinute);
  const rowSpan = Math.max(1, Math.ceil(durationMinutes / 30));

  return {
    row,
    rowSpan,
    column: dayOfWeek,
  };
}

/**
 * Format event time range for display
 */
export function formatEventTime(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get day name abbreviation (Mon, Tue, etc.)
 */
export function getDayAbbreviation(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get month and day for display (Jan 15, etc.)
 */
export function getMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get week range string for display (Jan 15 - Jan 21, 2024)
 */
export function getWeekRangeString(weekDates: Date[]): string {
  const start = weekDates[0];
  const end = weekDates[6];
  const year = start.getFullYear();

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${startStr} - ${endStr}, ${year}`;
}
