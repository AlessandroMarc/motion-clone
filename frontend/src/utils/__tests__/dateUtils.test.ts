import {
  formatDate,
  isOverdue,
  normalizeToMidnight,
  parseLocalDate,
  toLocalDateString,
  formatTime,
  formatTimeRange,
  formatDateDisplay,
  formatDateTimeLocal,
  formatDateLong,
} from '../dateUtils';

describe('dateUtils', () => {
  // ─── formatDate ───────────────────────────────────────────────────────────────
  describe('formatDate', () => {
    it('should return "No due date" for null input', () => {
      expect(formatDate(null)).toBe('No due date');
    });

    it('should format a Date object', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatDate(date);
      expect(result).toMatch(/Jan\s+15,\s+2024/);
    });

    it('should format an ISO date string', () => {
      const result = formatDate('2024-06-01T00:00:00');
      expect(result).toMatch(/Jun\s+1,\s+2024/);
    });

    it('should include time when includeTime is true', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDate(date, true);
      // Should include time markers
      expect(result).toMatch(/PM|AM/);
    });

    it('should not include time when includeTime is false (default)', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDate(date, false);
      expect(result).not.toMatch(/\d{1,2}:\d{2}/);
    });
  });

  // ─── isOverdue ────────────────────────────────────────────────────────────────
  describe('isOverdue', () => {
    it('should return false for null', () => {
      expect(isOverdue(null)).toBe(false);
    });

    it('should return true for a date in the past', () => {
      const past = new Date('2000-01-01');
      expect(isOverdue(past)).toBe(true);
    });

    it('should return false for a date in the future', () => {
      const future = new Date('2099-12-31');
      expect(isOverdue(future)).toBe(false);
    });

    it('should accept ISO date strings', () => {
      expect(isOverdue('2000-01-01T00:00:00')).toBe(true);
      expect(isOverdue('2099-01-01T00:00:00')).toBe(false);
    });
  });

  // ─── normalizeToMidnight ──────────────────────────────────────────────────────
  describe('normalizeToMidnight', () => {
    it('should set hours, minutes, seconds, and milliseconds to zero', () => {
      const date = new Date('2024-05-20T15:45:30.500');
      const result = normalizeToMidnight(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should preserve the year, month, and day', () => {
      const date = new Date('2024-05-20T15:45:30');
      const result = normalizeToMidnight(date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // May = 4
      expect(result.getDate()).toBe(20);
    });

    it('should not mutate the original date', () => {
      const date = new Date('2024-05-20T15:45:30');
      normalizeToMidnight(date);
      expect(date.getHours()).toBe(15);
    });
  });

  // ─── formatTime ───────────────────────────────────────────────────────────────
  describe('formatTime', () => {
    it('should format morning time as AM', () => {
      const date = new Date('2024-01-01T09:30:00');
      const result = formatTime(date);
      expect(result).toMatch(/9:30\s*AM/);
    });

    it('should format afternoon time as PM', () => {
      const date = new Date('2024-01-01T14:00:00');
      const result = formatTime(date);
      expect(result).toMatch(/2:00\s*PM/);
    });

    it('should format noon as 12:00 PM', () => {
      const date = new Date('2024-01-01T12:00:00');
      const result = formatTime(date);
      expect(result).toMatch(/12:00\s*PM/);
    });

    it('should format midnight as 12:00 AM', () => {
      const date = new Date('2024-01-01T00:00:00');
      const result = formatTime(date);
      expect(result).toMatch(/12:00\s*AM/);
    });
  });

  // ─── formatTimeRange ──────────────────────────────────────────────────────────
  describe('formatTimeRange', () => {
    it('should format a range with dash', () => {
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:30:00');
      const result = formatTimeRange(start, end);
      expect(result).toContain('–');
      expect(result).toMatch(/9:00\s*AM/);
      expect(result).toMatch(/10:30\s*AM/);
    });
  });

  // ─── formatDateDisplay ────────────────────────────────────────────────────────
  describe('formatDateDisplay', () => {
    it('should include weekday and date', () => {
      const monday = new Date('2024-01-15');
      const result = formatDateDisplay(monday);
      expect(result).toMatch(/Monday/);
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
    });
  });

  // ─── formatDateTimeLocal ─────────────────────────────────────────────────────
  describe('formatDateTimeLocal', () => {
    it('should return YYYY-MM-DDTHH:mm format', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatDateTimeLocal(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should pad single digit month and day', () => {
      const date = new Date('2024-01-05T09:05:00');
      const result = formatDateTimeLocal(date);
      expect(result).toContain('2024-01-05');
      expect(result).toContain('09:05');
    });
  });

  // ─── formatDateLong ────────────────────────────────────────────────────────────
  describe('formatDateLong', () => {
    it('should include full weekday and month name', () => {
      const monday = new Date('2024-01-15');
      const result = formatDateLong(monday);
      expect(result).toMatch(/Monday/);
      expect(result).toMatch(/January/);
      expect(result).toMatch(/2024/);
    });
  });

  // ─── TIMEZONE SAFETY TESTS ─────────────────────────────────────────────────────
  // These tests document and enforce the fix for the "day before" bug
  // where dates were shifted backwards due to UTC-midnight conversions
  describe('parseLocalDate - Timezone Safety', () => {
    const TEST_DATES = [
      '2026-03-05', // Winter -> spring transition
      '2024-01-01', // Year boundary
      '2024-02-29', // Leap year
      '2026-12-31', // Year end
      '2024-07-15', // Mid-year
    ];

    it('should parse ISO date strings in local timezone', () => {
      const date = parseLocalDate('2026-03-05');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(2); // 0-indexed, so 2 = March
      expect(date.getDate()).toBe(5);
    });

    it('should set time to midnight (00:00:00) in local timezone', () => {
      const date = parseLocalDate('2026-03-05');
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('should handle all test dates correctly', () => {
      TEST_DATES.forEach(dateStr => {
        const date = parseLocalDate(dateStr);
        const [year, month, day] = dateStr.split('-').map(Number);

        expect(date.getFullYear()).toBe(year);
        expect(date.getMonth()).toBe(month - 1); // Month is 0-indexed
        expect(date.getDate()).toBe(day);
        expect(date.getHours()).toBe(0);
        expect(date.getMinutes()).toBe(0);
      });
    });

    it('should reject invalid dates', () => {
      expect(() => parseLocalDate('invalid')).toThrow();
      expect(() => parseLocalDate('2026-13-01')).toThrow(); // Invalid month
      expect(() => parseLocalDate('2026-02-30')).toThrow(); // Invalid day
    });

    it('should reject invalid date formats', () => {
      expect(() => parseLocalDate('2026/03/05')).toThrow();
      expect(() => parseLocalDate('03-05-2026')).toThrow();
      expect(() => parseLocalDate('2026-3-5')).toThrow(); // Not padded
    });

    it('should handle leap year correctly', () => {
      const leapDay = parseLocalDate('2024-02-29');
      expect(leapDay.getDate()).toBe(29);
      expect(leapDay.getMonth()).toBe(1); // February is month 1
    });

    it('should handle year boundaries', () => {
      const yearStart = parseLocalDate('2026-01-01');
      expect(yearStart.getFullYear()).toBe(2026);
      expect(yearStart.getMonth()).toBe(0);
      expect(yearStart.getDate()).toBe(1);

      const yearEnd = parseLocalDate('2026-12-31');
      expect(yearEnd.getFullYear()).toBe(2026);
      expect(yearEnd.getMonth()).toBe(11);
      expect(yearEnd.getDate()).toBe(31);
    });
  });

  describe('toLocalDateString - Date formatting', () => {
    it('should format a Date to YYYY-MM-DD in local timezone', () => {
      const date = new Date(2026, 2, 5); // March 5, 2026
      const result = toLocalDateString(date);
      expect(result).toBe('2026-03-05');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2026, 0, 5); // January 5
      expect(toLocalDateString(date)).toBe('2026-01-05');

      const date2 = new Date(2026, 2, 1); // March 1
      expect(toLocalDateString(date2)).toBe('2026-03-01');
    });
  });

  describe('Round-trip conversion: parse -> normalize -> format', () => {
    const TEST_DATES = [
      '2026-03-05',
      '2024-01-01',
      '2024-02-29',
      '2026-12-31',
      '2024-07-15',
    ];

    it('should preserve date through complete workflow', () => {
      TEST_DATES.forEach(dateStr => {
        const parsed = parseLocalDate(dateStr);
        const normalized = normalizeToMidnight(parsed);
        const formatted = toLocalDateString(normalized);

        expect(formatted).toBe(dateStr);
      });
    });
  });

  describe('Integration: Form input handling pattern', () => {
    it('should handle typical form input workflow correctly', () => {
      // Simulate: user selects "2026-03-05" in date input field
      const userInputValue = '2026-03-05';

      // Step 1: Parse from form (ISO string from input)
      const parsedDate = parseLocalDate(userInputValue);

      // Step 2: Normalize to midnight (ensure consistent time)
      const normalized = normalizeToMidnight(parsedDate);

      // Step 3: Verify the date component is preserved locally
      // (Important: not checking toISOString() as it uses UTC conversion)
      expect(normalized.getDate()).toBe(5);
      expect(normalized.getMonth()).toBe(2);
      expect(normalized.getFullYear()).toBe(2026);
      expect(normalized.getHours()).toBe(0);

      // Step 4: When retrieved from server, should parse back correctly
      const roundTripped = parseLocalDate(userInputValue);
      expect(roundTripped.getDate()).toBe(5);
      expect(roundTripped.getMonth()).toBe(2);
    });
  });

  describe('Regression Prevention: Prevent UTC-midnight bug', () => {
    it('should NOT use new Date(isoString) for date-only strings', () => {
      // This documents what NOT to do.
      // The bug: new Date("2026-03-05") interprets as UTC midnight,
      // then converts to local time, causing date shift in some timezones
      // (especially UTC-X timezones where midnight-1-hour is previous day)

      const dateString = '2026-03-05';
      const correctApproach = parseLocalDate(dateString);

      // correctApproach always parses the date components directly
      // without UTC conversion, so the date is always correct
      expect(correctApproach.getDate()).toBe(5);
      expect(correctApproach.getMonth()).toBe(2);
      expect(correctApproach.getFullYear()).toBe(2026);
    });

    it('should always normalize date-only inputs to midnight local time', () => {
      const input = '2026-03-05';
      const parsed = parseLocalDate(input);
      const normalized = normalizeToMidnight(parsed);

      // Midnight in local timezone, not UTC
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);

      // Date preserved
      expect(normalized.getDate()).toBe(5);
      expect(normalized.getMonth()).toBe(2);
    });
  });
});
