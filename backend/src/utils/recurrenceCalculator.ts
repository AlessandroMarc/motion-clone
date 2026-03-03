/**
 * Recurrence utilities for generating task occurrence dates
 * Handles daily, weekly, and monthly patterns with configurable intervals
 */

/**
 * Calculate the next occurrence date based on recurrence pattern and interval
 * @param date Starting date
 * @param pattern 'daily' | 'weekly' | 'monthly'
 * @param interval Number of periods to add (e.g., 2 for "every 2 weeks")
 * @returns Next occurrence date
 */
export function calculateNextOccurrence(
  date: Date,
  pattern: string,
  interval: number
): Date {
  // Validate interval
  if (!Number.isInteger(interval) || interval <= 0) {
    throw new Error('interval must be a positive integer');
  }

  const next = new Date(date);

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;

    case 'monthly': {
      const originalDate = date.getDate();
      // Set to day 1 first to avoid overflow issues
      next.setDate(1);
      next.setMonth(next.getMonth() + interval);

      // Handle month-end overflow: if the day doesn't exist in target month,
      // cap at the last day of that month
      const lastDayOfMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();
      if (originalDate > lastDayOfMonth) {
        next.setDate(lastDayOfMonth);
      } else {
        next.setDate(originalDate);
      }
      break;
    }

    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`);
  }

  return next;
}

/**
 * Generate an array of occurrence dates for a recurring task within a given horizon
 * @param startDate Start date (e.g., task due_date or next_generation_cutoff)
 * @param pattern 'daily' | 'weekly' | 'monthly'
 * @param interval Interval count
 * @param horizonEnd End date of the generation window
 * @returns Array of occurrence dates (including startDate if it's within the window)
 */
export function generateOccurrenceDates(
  startDate: Date,
  pattern: string,
  interval: number,
  horizonEnd: Date
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);

  // Normalize to start of day for consistent comparison
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(horizonEnd);
  end.setHours(23, 59, 59, 999);

  // Start from the first occurrence at or after the given start date
  if (currentDate < start) {
    currentDate = calculateNextOccurrence(currentDate, pattern, interval);
  }

  while (currentDate <= end) {
    occurrences.push(new Date(currentDate));
    currentDate = calculateNextOccurrence(currentDate, pattern, interval);
  }

  return occurrences;
}

/**
 * Calculate the 90-day horizon (from now until now + 90 days)
 * @param now Current date (defaults to today)
 * @returns End date of the 90-day window
 */
export function get90DayHorizon(now: Date = new Date()): Date {
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 90);
  horizon.setHours(23, 59, 59, 999);
  return horizon;
}
