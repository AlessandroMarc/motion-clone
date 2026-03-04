export function formatDate(date: Date | string | null, includeTime = false) {
  if (!date) return 'No due date';
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', options);
}

export function isOverdue(date: Date | string | null) {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Normalize a date to midnight (00:00:00.000) in local time
 * Used for deadlines to ensure consistent date-only comparison
 */
export function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Format a Date as a local-timezone YYYY-MM-DD string.
 * Use this instead of .toISOString().slice(0,10) when sending date-only
 * values to the backend, to avoid UTC midnight rolling the date back one day
 * for users in negative-offset timezones (e.g. UTC-5).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD date string as local midnight.
 * JavaScript's `new Date("YYYY-MM-DD")` treats ISO date-only strings as
 * UTC midnight, which shifts the date back one day for users with negative
 * UTC offsets (e.g., UTC-5, "users west of UTC").
 * This function constructs the date in local time and validates that the
 * resulting date matches the input components.
 */
export function parseLocalDate(value: string): Date {
  const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO_DATE_ONLY.test(value)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, got "${value}"`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Validate that the date is a real calendar date (not rolled over due to out-of-range values)
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    throw new Error(`Invalid calendar date: "${value}"`);
  }
  return date;
}

/** Time only, e.g. "9:00 AM". */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Time range, e.g. "9:00 AM – 10:00 AM". */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Weekday + short date, e.g. "Monday, Jan 27". */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** ISO-like string for datetime-local input: YYYY-MM-DDTHH:mm. */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Full long date, e.g. "Monday, January 27, 2025". */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
