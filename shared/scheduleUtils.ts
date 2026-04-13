/**
 * Shared schedule interpretation utilities.
 * Used by both frontend (display) and backend (scheduling).
 */
import type { DayOfWeek, DaySchedule, Schedule } from './types.js';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Return the working hours for a specific day of the week given a schedule.
 * Returns null if the day is not a working day.
 *
 * Resolution order:
 * 1. If working_days exists AND has an entry for this day → use it (null = off)
 * 2. Otherwise → fall back to legacy working_hours_start/end
 */
export function getScheduleDayHours(
  schedule: Schedule,
  dayOfWeek: DayOfWeek
): DaySchedule | null {
  if (schedule.working_days) {
    if (dayOfWeek in schedule.working_days) {
      return schedule.working_days[dayOfWeek] ?? null;
    }
  }
  return {
    start: schedule.working_hours_start,
    end: schedule.working_hours_end,
  };
}

/**
 * Return a human-readable summary of the working hours for a schedule.
 * When working_days is set, groups days with identical hours and formats them.
 * Falls back to the legacy working_hours_start/end when working_days is absent.
 */
export function formatWorkingHoursSummary(schedule: Schedule): string {
  if (!schedule.working_days) {
    return `${String(schedule.working_hours_start).padStart(2, '0')}:00 – ${String(schedule.working_hours_end).padStart(2, '0')}:00`;
  }

  const groups: { days: string[]; start: number; end: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = i as DayOfWeek;
    const dayHours = schedule.working_days[dayOfWeek];
    if (dayHours === null) continue;

    const { start, end } = dayHours ?? {
      start: schedule.working_hours_start,
      end: schedule.working_hours_end,
    };

    const dayName = DAY_SHORT[i]!;
    const existing = groups.find(g => g.start === start && g.end === end);
    if (existing) {
      existing.days.push(dayName);
    } else {
      groups.push({
        days: [dayName],
        start,
        end,
      });
    }
  }

  if (groups.length === 0) return 'No working days';

  return groups
    .map(
      g =>
        `${g.days.join(', ')}: ${String(g.start).padStart(2, '0')}:00 – ${String(g.end).padStart(2, '0')}:00`
    )
    .join(' | ');
}
