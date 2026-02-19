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
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-27T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should return "No due date" if date is null', () => {
      expect(formatDate(null)).toBe('No due date');
    });

    it('should format date correctly without time', () => {
      const date = new Date('2025-01-27T10:00:00');
      // toLocaleDateString might vary by environment, but en-US usually gives "Jan 27, 2025"
      // We can check if it contains the key components
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('27');
      expect(formatted).toContain('2025');
    });

    it('should format date string correctly', () => {
      const formatted = formatDate('2025-01-27T10:00:00');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('27');
      expect(formatted).toContain('2025');
    });

    it('should include time when includeTime is true', () => {
      const date = new Date('2025-01-27T10:30:00');
      const formatted = formatDate(date, true);
      expect(formatted).toMatch(/\d{1,2}:\d{2}(\s*(AM|PM))?/);
    });
  });

  describe('isOverdue', () => {
    it('should return false if date is null', () => {
      expect(isOverdue(null)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isOverdue(futureDate)).toBe(false);
    });
  });

  describe('normalizeToMidnight', () => {
    it('should set hours, minutes, seconds and milliseconds to zero', () => {
      const date = new Date('2025-01-27T15:30:45.123');
      const normalized = normalizeToMidnight(date);
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);
      expect(normalized.getDate()).toBe(27);
      expect(normalized.getMonth()).toBe(0); // January
      expect(normalized.getFullYear()).toBe(2025);
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2025-01-27T09:05:00');
      const formatted = formatTime(date);
      // "9:05 AM"
      expect(formatted).toMatch(/9:05\s*AM/);
    });

    it('should handle PM correctly', () => {
      const date = new Date('2025-01-27T21:30:00');
      const formatted = formatTime(date);
      // "9:30 PM"
      expect(formatted).toMatch(/9:30\s*PM/);
    });
  });

  describe('formatTimeRange', () => {
    it('should format time range correctly', () => {
      const start = new Date('2025-01-27T09:00:00');
      const end = new Date('2025-01-27T10:00:00');
      const formatted = formatTimeRange(start, end);
      expect(formatted).toMatch(/9:00\s*AM/);
      expect(formatted).toMatch(/10:00\s*AM/);
    });
  });

  describe('formatDateDisplay', () => {
    it('should format date display correctly', () => {
      const date = new Date('2025-01-27T10:00:00');
      const formatted = formatDateDisplay(date);
      // "Monday, Jan 27" (Jan 27, 2025 is a Monday)
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('27');
    });
  });

  describe('formatDateTimeLocal', () => {
    it('should format to YYYY-MM-DDTHH:mm', () => {
      const date = new Date(2025, 0, 27, 9, 5); // Jan 27, 2025, 09:05
      const formatted = formatDateTimeLocal(date);
      expect(formatted).toBe('2025-01-27T09:05');
    });

    it('should pad single digits with zero', () => {
      const date = new Date(2025, 10, 5, 14, 3); // Nov 5, 2025, 14:03
      const formatted = formatDateTimeLocal(date);
      expect(formatted).toBe('2025-11-05T14:03');
    });
  });

  describe('formatDateLong', () => {
    it('should format date long correctly', () => {
      const date = new Date('2025-01-27T10:00:00');
      const formatted = formatDateLong(date);
      // "Monday, January 27, 2025"
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('January');
      expect(formatted).toContain('27');
      expect(formatted).toContain('2025');
    });
  });
});
