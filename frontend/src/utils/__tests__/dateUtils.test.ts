import {
  formatDate,
  isOverdue,
  normalizeToMidnight,
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
});
