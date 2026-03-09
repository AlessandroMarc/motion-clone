/**
 * Shared date utilities used by both frontend and backend.
 * Handles timezone-safe date parsing and formatting for date-only values.
 */

/**
 * Normalize a Date to midnight (00:00:00.000) in local time.
 * Returns a new Date object; does not mutate the input.
 */
export function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Format a Date as a local-timezone YYYY-MM-DD string.
 *
 * Use this instead of .toISOString().slice(0,10) to avoid UTC midnight
 * rolling the date back for users in negative-offset timezones.
 *
 * If a string is passed and is already YYYY-MM-DD, it is returned as-is.
 */
export function toLocalDateString(value: Date | string): string {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Full ISO timestamp string — parse then extract local parts
    const d = new Date(value);
    return formatDateParts(d);
  }
  return formatDateParts(value);
}

function formatDateParts(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string as local midnight.
 *
 * JavaScript's `new Date("YYYY-MM-DD")` treats ISO date-only strings as
 * UTC midnight, which shifts the date back one day for users with negative
 * UTC offsets. This function constructs the date in local time and validates
 * that the resulting date matches the input components.
 */
export function parseLocalDate(value: string): Date {
  const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO_DATE_ONLY.test(value)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, got "${value}"`);
  }
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    throw new Error(`Invalid calendar date: "${value}"`);
  }
  return date;
}
