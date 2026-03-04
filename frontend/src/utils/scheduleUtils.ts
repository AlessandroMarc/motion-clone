import type { DayOfWeek, Schedule } from '@/types';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Return a human-readable summary of the working hours for a schedule.
 * When working_days is set, groups days with identical hours and formats them.
 * Falls back to the legacy working_hours_start/end when working_days is absent.
 */
export function formatWorkingHoursSummary(schedule: Schedule): string {
  if (!schedule.working_days) {
    return `${String(schedule.working_hours_start).padStart(2, '0')}:00 – ${String(schedule.working_hours_end).padStart(2, '0')}:00`;
  }

  // Group consecutive/non-consecutive days with identical hours
  const groups: { days: string[]; start: number; end: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = i as DayOfWeek;
    const dayHours = schedule.working_days[dayOfWeek];
    // Skip only if explicitly marked as non-working (null)
    // If undefined (key missing), fall back to legacy hours
    if (dayHours === null) continue;
    
    const { start, end } = dayHours ?? {
      start: schedule.working_hours_start,
      end: schedule.working_hours_end,
    };
    
    const existing = groups.find(g => g.start === start && g.end === end);
    if (existing) {
      existing.days.push(DAY_SHORT[i] as string);
    } else {
      groups.push({
        days: [DAY_SHORT[i] as string],
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
