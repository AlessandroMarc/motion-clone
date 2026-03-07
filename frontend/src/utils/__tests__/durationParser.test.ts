import { parseDurationSuggestions, formatDurationDisplay } from '../durationParser';

describe('parseDurationSuggestions', () => {
  it('returns minutes and hours suggestions for integer input', () => {
    const result = parseDurationSuggestions('30');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '30 minutes', minutes: 30 });
    expect(result[1]).toEqual({ label: '30 hrs', minutes: 1800 });
  });

  it('returns correct suggestions for input "2"', () => {
    const result = parseDurationSuggestions('2');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '2 minutes', minutes: 2 });
    expect(result[1]).toEqual({ label: '2 hrs', minutes: 120 });
  });

  it('returns singular "minute" for input "1"', () => {
    const result = parseDurationSuggestions('1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '1 minute', minutes: 1 });
    expect(result[1]).toEqual({ label: '1 hr', minutes: 60 });
  });

  it('handles decimal input "4.5" with correct hour conversion', () => {
    const result = parseDurationSuggestions('4.5');
    expect(result).toHaveLength(2);
    // 4.5 rounds to 5 as minutes
    expect(result[0]).toEqual({ label: '5 minutes', minutes: 5 });
    // 4.5 hours = 4 hrs 30 min = 270 minutes
    expect(result[1]).toEqual({ label: '4 hrs 30 min', minutes: 270 });
  });

  it('handles decimal input "1.5"', () => {
    const result = parseDurationSuggestions('1.5');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '2 minutes', minutes: 2 });
    expect(result[1]).toEqual({ label: '1 hr 30 min', minutes: 90 });
  });

  it('handles decimal input "0.5" (30 minutes as hours)', () => {
    const result = parseDurationSuggestions('0.5');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '1 minute', minutes: 1 });
    expect(result[1]).toEqual({ label: '30 min', minutes: 30 });
  });

  it('returns empty array for empty string', () => {
    expect(parseDurationSuggestions('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseDurationSuggestions('   ')).toEqual([]);
  });

  it('returns empty array for zero', () => {
    expect(parseDurationSuggestions('0')).toEqual([]);
  });

  it('returns empty array for negative number', () => {
    expect(parseDurationSuggestions('-5')).toEqual([]);
  });

  it('returns empty array for non-numeric input', () => {
    expect(parseDurationSuggestions('abc')).toEqual([]);
  });

  it('returns empty array for mixed non-numeric input', () => {
    expect(parseDurationSuggestions('12abc')).toEqual([]);
  });

  it('handles trailing dot (e.g. "5.")', () => {
    const result = parseDurationSuggestions('5.');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '5 minutes', minutes: 5 });
    expect(result[1]).toEqual({ label: '5 hrs', minutes: 300 });
  });

  it('handles leading zeros (e.g. "01")', () => {
    const result = parseDurationSuggestions('01');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '1 minute', minutes: 1 });
    expect(result[1]).toEqual({ label: '1 hr', minutes: 60 });
  });

  it('caps minutes interpretation at 1440 (24 hours)', () => {
    const result = parseDurationSuggestions('1500');
    // 1500 minutes > 1440, so only hours interpretation
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: '1500 hrs', minutes: 90000 });
  });

  it('includes minutes at 1440 boundary', () => {
    const result = parseDurationSuggestions('1440');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: '1440 minutes', minutes: 1440 });
    expect(result[1]).toEqual({ label: '1440 hrs', minutes: 86400 });
  });

  it('deduplicates when both interpretations give same minutes', () => {
    // input "60" → 60 minutes and 60 hours (3600 min) are different, both shown
    const result = parseDurationSuggestions('60');
    expect(result).toHaveLength(2);
    expect(result[0].minutes).toBe(60);
    expect(result[1].minutes).toBe(3600);
  });

  it('trims whitespace from input', () => {
    const result = parseDurationSuggestions('  30  ');
    expect(result).toHaveLength(2);
    expect(result[0].minutes).toBe(30);
  });
});

describe('formatDurationDisplay', () => {
  it('formats minutes only', () => {
    expect(formatDurationDisplay(30)).toBe('30 min');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDurationDisplay(60)).toBe('1 hr');
  });

  it('formats hours and minutes', () => {
    expect(formatDurationDisplay(90)).toBe('1 hr 30 min');
  });

  it('formats multiple hours', () => {
    expect(formatDurationDisplay(120)).toBe('2 hrs');
  });

  it('formats multiple hours with minutes', () => {
    expect(formatDurationDisplay(150)).toBe('2 hrs 30 min');
  });

  it('formats 15 minutes', () => {
    expect(formatDurationDisplay(15)).toBe('15 min');
  });

  it('formats zero', () => {
    expect(formatDurationDisplay(0)).toBe('0 min');
  });

  it('formats negative as 0 min', () => {
    expect(formatDurationDisplay(-10)).toBe('0 min');
  });

  it('formats large durations', () => {
    expect(formatDurationDisplay(270)).toBe('4 hrs 30 min');
  });
});
