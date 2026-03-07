import {
  normalizeToMidnight,
  toLocalDateString,
  parseLocalDate,
} from '../dateUtils';

describe('normalizeToMidnight', () => {
  it('sets hours, minutes, seconds, and milliseconds to zero', () => {
    const date = new Date(2025, 5, 15, 14, 30, 45, 123);
    const result = normalizeToMidnight(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the date parts', () => {
    const date = new Date(2025, 5, 15, 14, 30);
    const result = normalizeToMidnight(date);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the original date', () => {
    const date = new Date(2025, 5, 15, 14, 30);
    const original = date.getTime();
    normalizeToMidnight(date);
    expect(date.getTime()).toBe(original);
  });
});

describe('toLocalDateString', () => {
  it('formats a Date as YYYY-MM-DD using local time', () => {
    const date = new Date(2025, 0, 5); // Jan 5, 2025 local
    expect(toLocalDateString(date)).toBe('2025-01-05');
  });

  it('pads single-digit month and day', () => {
    const date = new Date(2025, 2, 3); // Mar 3
    expect(toLocalDateString(date)).toBe('2025-03-03');
  });

  it('passes through an already YYYY-MM-DD string', () => {
    expect(toLocalDateString('2025-06-15')).toBe('2025-06-15');
  });

  it('extracts local date from an ISO timestamp string', () => {
    // Create a known local date to test
    const localDate = new Date(2025, 5, 15, 10, 0);
    const isoString = localDate.toISOString();
    expect(toLocalDateString(isoString)).toBe('2025-06-15');
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const result = parseLocalDate('2025-06-15');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5); // June = 5
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('throws on invalid format', () => {
    expect(() => parseLocalDate('2025-6-15')).toThrow('Invalid date format');
    expect(() => parseLocalDate('not-a-date')).toThrow('Invalid date format');
    expect(() => parseLocalDate('2025-06-15T10:00:00')).toThrow(
      'Invalid date format'
    );
  });

  it('throws on invalid calendar dates', () => {
    expect(() => parseLocalDate('2025-02-30')).toThrow(
      'Invalid calendar date'
    );
    expect(() => parseLocalDate('2025-13-01')).toThrow(
      'Invalid calendar date'
    );
  });

  it('handles leap year correctly', () => {
    const result = parseLocalDate('2024-02-29');
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(1);
  });

  it('rejects Feb 29 on non-leap years', () => {
    expect(() => parseLocalDate('2025-02-29')).toThrow(
      'Invalid calendar date'
    );
  });
});
