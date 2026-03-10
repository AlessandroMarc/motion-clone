import type { Schedule } from '../types';
import {
  getScheduleDayHours,
  formatWorkingHoursSummary,
} from '../scheduleUtils';

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sched-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 9,
  working_hours_end: 17,
  is_default: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('getScheduleDayHours', () => {
  it('returns legacy hours when working_days is absent', () => {
    const schedule = makeSchedule();
    expect(getScheduleDayHours(schedule, 1)).toEqual({ start: 9, end: 17 });
  });

  it('returns specific day hours from working_days', () => {
    const schedule = makeSchedule({
      working_days: {
        0: null,
        1: { start: 10, end: 18 },
        2: { start: 10, end: 18 },
        3: { start: 10, end: 18 },
        4: { start: 10, end: 18 },
        5: { start: 10, end: 16 },
        6: null,
      },
    });
    expect(getScheduleDayHours(schedule, 1)).toEqual({ start: 10, end: 18 });
    expect(getScheduleDayHours(schedule, 5)).toEqual({ start: 10, end: 16 });
  });

  it('returns null for non-working days (null entries)', () => {
    const schedule = makeSchedule({
      working_days: {
        0: null,
        1: { start: 9, end: 17 },
        2: { start: 9, end: 17 },
        3: { start: 9, end: 17 },
        4: { start: 9, end: 17 },
        5: { start: 9, end: 17 },
        6: null,
      },
    });
    expect(getScheduleDayHours(schedule, 0)).toBeNull();
    expect(getScheduleDayHours(schedule, 6)).toBeNull();
  });

  it('falls back to legacy hours for missing keys in working_days', () => {
    // Only some days are specified
    const schedule = makeSchedule({
      working_days: {
        1: { start: 10, end: 18 },
      },
    });
    // Day 1 is defined
    expect(getScheduleDayHours(schedule, 1)).toEqual({ start: 10, end: 18 });
    // Day 2 is not defined, falls back to legacy
    expect(getScheduleDayHours(schedule, 2)).toEqual({ start: 9, end: 17 });
  });
});

describe('formatWorkingHoursSummary', () => {
  it('formats legacy hours when working_days is absent', () => {
    const schedule = makeSchedule({
      working_hours_start: 9,
      working_hours_end: 17,
    });
    expect(formatWorkingHoursSummary(schedule)).toBe('09:00 – 17:00');
  });

  it('groups days with identical hours', () => {
    const schedule = makeSchedule({
      working_days: {
        0: null,
        1: { start: 9, end: 17 },
        2: { start: 9, end: 17 },
        3: { start: 9, end: 17 },
        4: { start: 9, end: 17 },
        5: { start: 9, end: 17 },
        6: null,
      },
    });
    expect(formatWorkingHoursSummary(schedule)).toBe(
      'Mon, Tue, Wed, Thu, Fri: 09:00 – 17:00'
    );
  });

  it('separates groups with different hours', () => {
    const schedule = makeSchedule({
      working_days: {
        0: null,
        1: { start: 9, end: 17 },
        2: { start: 9, end: 17 },
        3: { start: 9, end: 17 },
        4: { start: 9, end: 17 },
        5: { start: 10, end: 14 },
        6: null,
      },
    });
    expect(formatWorkingHoursSummary(schedule)).toBe(
      'Mon, Tue, Wed, Thu: 09:00 – 17:00 | Fri: 10:00 – 14:00'
    );
  });

  it('returns "No working days" when all days are null', () => {
    const schedule = makeSchedule({
      working_days: {
        0: null,
        1: null,
        2: null,
        3: null,
        4: null,
        5: null,
        6: null,
      },
    });
    expect(formatWorkingHoursSummary(schedule)).toBe('No working days');
  });

  it('pads single-digit hours with zero', () => {
    const schedule = makeSchedule({
      working_hours_start: 8,
      working_hours_end: 5,
    });
    expect(formatWorkingHoursSummary(schedule)).toBe('08:00 – 05:00');
  });
});
