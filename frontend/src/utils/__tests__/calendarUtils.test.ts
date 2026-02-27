import {
  getDateRange,
  getWeekDates,
  formatTimeSlot,
  getEventPosition,
  formatEventTime,
  isSameDay,
  getDayAbbreviation,
  getMonthDay,
} from '../calendarUtils';
import type { CalendarEventUnion } from '@/types';

function makeEvent(startTime: Date, endTime: Date): CalendarEventUnion {
  return {
    id: 'evt-1',
    title: 'Event',
    start_time: startTime,
    end_time: endTime,
    description: '',
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe('calendarUtils', () => {
  // ─── getDateRange ─────────────────────────────────────────────────────────────
  describe('getDateRange', () => {
    it('should return the correct number of dates', () => {
      const start = new Date('2024-01-01');
      const result = getDateRange(start, 7);
      expect(result).toHaveLength(7);
    });

    it('should start from the given date (at midnight)', () => {
      const start = new Date('2024-03-15T14:30:00');
      const result = getDateRange(start, 3);
      expect(result[0].getHours()).toBe(0);
      expect(result[0].getFullYear()).toBe(2024);
      expect(result[0].getMonth()).toBe(2); // March = 2
      expect(result[0].getDate()).toBe(15);
    });

    it('should return consecutive dates', () => {
      const start = new Date('2024-01-01');
      const result = getDateRange(start, 4);
      for (let i = 1; i < result.length; i++) {
        const diff =
          (result[i].getTime() - result[i - 1].getTime()) /
          (1000 * 60 * 60 * 24);
        expect(diff).toBe(1);
      }
    });

    it('should return empty array for 0 days', () => {
      const start = new Date('2024-01-01');
      expect(getDateRange(start, 0)).toEqual([]);
    });
  });

  // ─── getWeekDates ──────────────────────────────────────────────────────────────
  describe('getWeekDates', () => {
    it('should always return 7 dates', () => {
      const result = getWeekDates(new Date('2024-01-15')); // Monday
      expect(result).toHaveLength(7);
    });

    it('should start on Monday for a Monday input', () => {
      const monday = new Date('2024-01-15'); // known Monday
      const result = getWeekDates(monday);
      expect(result[0].getDay()).toBe(1); // Monday = 1
    });

    it('should start on Monday when given a Wednesday', () => {
      const wednesday = new Date('2024-01-17');
      const result = getWeekDates(wednesday);
      expect(result[0].getDay()).toBe(1);
    });

    it('should start on Monday when given a Sunday', () => {
      const sunday = new Date('2024-01-21');
      const result = getWeekDates(sunday);
      expect(result[0].getDay()).toBe(1);
    });

    it('should end on Sunday', () => {
      const monday = new Date('2024-01-15');
      const result = getWeekDates(monday);
      expect(result[6].getDay()).toBe(0); // Sunday = 0
    });
  });

  // ─── formatTimeSlot ────────────────────────────────────────────────────────────
  describe('formatTimeSlot', () => {
    it('should format midnight correctly', () => {
      expect(formatTimeSlot(0)).toBe('12:00 AM');
    });

    it('should format noon correctly', () => {
      expect(formatTimeSlot(12)).toBe('12:00 PM');
    });

    it('should format morning hours', () => {
      expect(formatTimeSlot(9)).toBe('9:00 AM');
    });

    it('should format afternoon hours', () => {
      expect(formatTimeSlot(15)).toBe('3:00 PM');
    });

    it('should format 11 AM', () => {
      expect(formatTimeSlot(11)).toBe('11:00 AM');
    });

    it('should format 23 (11 PM)', () => {
      expect(formatTimeSlot(23)).toBe('11:00 PM');
    });
  });

  // ─── getEventPosition ──────────────────────────────────────────────────────────
  describe('getEventPosition', () => {
    it('should return null for events outside the current week', () => {
      const weekDates = getWeekDates(new Date('2024-01-15'));
      const pastEvent = makeEvent(
        new Date('2024-01-01T10:00:00'),
        new Date('2024-01-01T11:00:00')
      );
      const result = getEventPosition(pastEvent, weekDates);
      expect(result).toBeNull();
    });

    it('should return correct column for a Wednesday event', () => {
      const wednesday = new Date('2024-01-17T10:00:00');
      const event = makeEvent(wednesday, new Date('2024-01-17T11:00:00'));
      const weekDates = getWeekDates(wednesday);
      const position = getEventPosition(event, weekDates);
      expect(position).not.toBeNull();
      expect(position!.column).toBe(3); // Wednesday = 3
    });

    it('should return correct row for a 9:00 AM event', () => {
      const start = new Date('2024-01-15T09:00:00'); // Monday 9 AM
      const event = makeEvent(start, new Date('2024-01-15T10:00:00'));
      const weekDates = getWeekDates(start);
      const position = getEventPosition(event, weekDates);
      expect(position).not.toBeNull();
      // row = startHour * 2 + halfIndex = 9*2 + 1 = 19
      expect(position!.row).toBe(19);
    });

    it('should return correct rowSpan for a 60-min event (2 slots)', () => {
      const start = new Date('2024-01-15T10:00:00');
      const event = makeEvent(start, new Date('2024-01-15T11:00:00'));
      const weekDates = getWeekDates(start);
      const position = getEventPosition(event, weekDates);
      expect(position).not.toBeNull();
      expect(position!.rowSpan).toBe(2);
    });

    it('should map Sunday to column 7', () => {
      const sunday = new Date('2024-01-21T10:00:00');
      const event = makeEvent(sunday, new Date('2024-01-21T11:00:00'));
      const weekDates = getWeekDates(sunday);
      const position = getEventPosition(event, weekDates);
      expect(position).not.toBeNull();
      expect(position!.column).toBe(7);
    });
  });

  // ─── formatEventTime ────────────────────────────────────────────────────────────
  describe('formatEventTime', () => {
    it('should format time range correctly (AM)', () => {
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:30:00');
      const result = formatEventTime(start, end);
      expect(result).toBe('9:00 AM - 10:30 AM');
    });

    it('should format time range crossing noon', () => {
      const start = new Date('2024-01-01T11:00:00');
      const end = new Date('2024-01-01T13:00:00');
      const result = formatEventTime(start, end);
      expect(result).toBe('11:00 AM - 1:00 PM');
    });
  });

  // ─── isSameDay ────────────────────────────────────────────────────────────────
  describe('isSameDay', () => {
    it('should return true for same day at different times', () => {
      const a = new Date('2024-01-15T09:00:00');
      const b = new Date('2024-01-15T22:00:00');
      expect(isSameDay(a, b)).toBe(true);
    });

    it('should return false for different days', () => {
      const a = new Date('2024-01-15');
      const b = new Date('2024-01-16');
      expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day in different months', () => {
      const a = new Date('2024-01-15');
      const b = new Date('2024-02-15');
      expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day in different years', () => {
      const a = new Date('2023-01-15');
      const b = new Date('2024-01-15');
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  // ─── getDayAbbreviation ───────────────────────────────────────────────────────
  describe('getDayAbbreviation', () => {
    it('should return short weekday name', () => {
      const monday = new Date('2024-01-15'); // known Monday
      const result = getDayAbbreviation(monday);
      expect(result).toBe('Mon');
    });

    it('should return Sun for Sunday', () => {
      const sunday = new Date('2024-01-21');
      const result = getDayAbbreviation(sunday);
      expect(result).toBe('Sun');
    });
  });

  // ─── getMonthDay ─────────────────────────────────────────────────────────────
  describe('getMonthDay', () => {
    it('should format month and day correctly', () => {
      const date = new Date('2024-01-15');
      const result = getMonthDay(date);
      expect(result).toMatch(/Jan\s+15/);
    });
  });
});
