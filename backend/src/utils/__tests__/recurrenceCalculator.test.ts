/**
 * Tests for backend recurrence calculator utilities
 */

import {
  calculateNextOccurrence,
  generateOccurrenceDates,
  get90DayHorizon,
} from '../recurrenceCalculator';

describe('recurrenceCalculator', () => {
  describe('calculateNextOccurrence', () => {
    it('should add days for daily pattern', () => {
      const date = new Date('2026-03-01');
      const next = calculateNextOccurrence(date, 'daily', 1);
      expect(next.toDateString()).toBe(new Date('2026-03-02').toDateString());
    });

    it('should respect interval for daily pattern', () => {
      const date = new Date('2026-03-01');
      const next = calculateNextOccurrence(date, 'daily', 3);
      expect(next.toDateString()).toBe(new Date('2026-03-04').toDateString());
    });

    it('should add weeks for weekly pattern', () => {
      const date = new Date('2026-03-01');
      const next = calculateNextOccurrence(date, 'weekly', 1);
      expect(next.toDateString()).toBe(new Date('2026-03-08').toDateString());
    });

    it('should respect interval for weekly pattern', () => {
      const date = new Date('2026-03-01');
      const next = calculateNextOccurrence(date, 'weekly', 2);
      expect(next.toDateString()).toBe(new Date('2026-03-15').toDateString());
    });

    it('should add months for monthly pattern', () => {
      const date = new Date('2026-03-15');
      const next = calculateNextOccurrence(date, 'monthly', 1);
      expect(next.toDateString()).toBe(new Date('2026-04-15').toDateString());
    });

    it('should respect interval for monthly pattern', () => {
      const date = new Date('2026-03-15');
      const next = calculateNextOccurrence(date, 'monthly', 3);
      expect(next.toDateString()).toBe(new Date('2026-06-15').toDateString());
    });

    it('should handle month-end overflow for monthly pattern', () => {
      // Jan 31 + 1 month should be Feb 28/29, not Mar 3
      const date = new Date('2026-01-31');
      const next = calculateNextOccurrence(date, 'monthly', 1);
      expect(next.toDateString()).toBe(new Date('2026-02-28').toDateString());
    });

    it('should handle month-end overflow for leap year', () => {
      // Jan 31 in leap year
      const date = new Date('2024-01-31');
      const next = calculateNextOccurrence(date, 'monthly', 1);
      expect(next.toDateString()).toBe(new Date('2024-02-29').toDateString());
    });

    it('should throw for unknown pattern', () => {
      const date = new Date('2026-03-01');
      expect(() => calculateNextOccurrence(date, 'unknown', 1)).toThrow();
    });
  });

  describe('generateOccurrenceDates', () => {
    it('should generate multiple daily occurrences', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-05');
      const occurrences = generateOccurrenceDates(start, 'daily', 1, end);
      expect(occurrences.length).toBe(5);
      expect(occurrences[0].toDateString()).toBe(
        new Date('2026-03-01').toDateString()
      );
      expect(occurrences[4].toDateString()).toBe(
        new Date('2026-03-05').toDateString()
      );
    });

    it('should generate weekly occurrences with interval', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-05-01');
      const occurrences = generateOccurrenceDates(start, 'weekly', 2, end);
      expect(occurrences.length).toBeGreaterThan(0);
      // Check spacing: each should be 14 days apart
      for (let i = 1; i < occurrences.length; i++) {
        const daysDiff =
          (occurrences[i].getTime() - occurrences[i - 1].getTime()) /
          (1000 * 60 * 60 * 24);
        // Allow small tolerance for floating point and daylight saving time
        expect(Math.abs(daysDiff - 14)).toBeLessThan(0.1); // ~2.4 hours tolerance for DST
      }
    });

    it('should generate monthly occurrences', () => {
      const start = new Date('2026-01-15');
      const end = new Date('2026-06-15');
      const occurrences = generateOccurrenceDates(start, 'monthly', 1, end);
      expect(occurrences.length).toBe(6); // Jan, Feb, Mar, Apr, May, Jun
    });

    it('should not include occurrences before start date', () => {
      const start = new Date('2026-03-10');
      const end = new Date('2026-03-20');
      const occurrences = generateOccurrenceDates(start, 'daily', 1, end);
      for (const occurrence of occurrences) {
        expect(occurrence.getTime()).toBeGreaterThanOrEqual(
          new Date('2026-03-10').getTime()
        );
      }
    });

    it('should not include occurrences after end date', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-15');
      const occurrences = generateOccurrenceDates(start, 'daily', 1, end);
      for (const occurrence of occurrences) {
        expect(occurrence.getTime()).toBeLessThanOrEqual(
          new Date('2026-03-15T23:59:59Z').getTime()
        );
      }
    });
  });

  describe('get90DayHorizon', () => {
    it('should return a date 90 days from now', () => {
      const now = new Date('2026-03-01');
      const horizon = get90DayHorizon(now);
      const daysDiff = Math.floor(
        (horizon.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(90);
    });

    it('should return current date if not provided', () => {
      const horizon = get90DayHorizon();
      expect(horizon).toBeDefined();
      expect(horizon.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
