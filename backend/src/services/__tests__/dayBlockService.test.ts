import { describe, test, expect } from '@jest/globals';
import {
  workingEndToTimeString,
  buildLocalDateTime,
} from '../dayBlockService.js';

describe('workingEndToTimeString', () => {
  test('handles integer hours', () => {
    expect(workingEndToTimeString(18)).toBe('18:00');
    expect(workingEndToTimeString(9)).toBe('09:00');
    expect(workingEndToTimeString(0)).toBe('00:00');
  });

  test('handles half-hours', () => {
    expect(workingEndToTimeString(17.5)).toBe('17:30');
    expect(workingEndToTimeString(9.5)).toBe('09:30');
  });

  test('handles quarter-hours', () => {
    expect(workingEndToTimeString(8.75)).toBe('08:45');
    expect(workingEndToTimeString(8.25)).toBe('08:15');
  });
});

describe('buildLocalDateTime', () => {
  test('produces a Date with the correct local-time components', () => {
    const d = buildLocalDateTime('2026-04-13', '14:30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April = 3 (0-based)
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
  });

  test('handles midnight (00:00)', () => {
    const d = buildLocalDateTime('2026-01-01', '00:00');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  test('handles end-of-day (23:59)', () => {
    const d = buildLocalDateTime('2026-12-31', '23:59');
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  test('does not interpret the date as UTC midnight (avoids timezone trap)', () => {
    // new Date('2026-04-13') would give UTC midnight which in UTC+1 is the previous day.
    // buildLocalDateTime must produce a date where getDate() === 13 in any timezone.
    const d = buildLocalDateTime('2026-04-13', '00:00');
    expect(d.getDate()).toBe(13);
  });
});
