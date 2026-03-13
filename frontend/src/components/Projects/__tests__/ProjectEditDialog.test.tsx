import { describe, expect, it } from '@jest/globals';
import { formatDateForInput } from '../ProjectEditDialog';

describe('ProjectEditDialog', () => {
  it('formats YYYY-MM-DD strings unchanged', () => {
    expect(formatDateForInput('2026-06-29')).toBe('2026-06-29');
  });

  it('formats ISO datetime strings to YYYY-MM-DD', () => {
    expect(formatDateForInput('2026-06-29T12:00:00+00:00')).toBe('2026-06-29');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatDateForInput(null)).toBe('');
    // @ts-expect-error: passing undefined for test
    expect(formatDateForInput(undefined)).toBe('');
  });
});
