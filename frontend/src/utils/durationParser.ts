export interface DurationSuggestion {
  label: string;
  minutes: number;
}

/**
 * Formats a fractional hour value into a human-readable string.
 * E.g., 1.5 → "1 hr 30 min", 2 → "2 hrs", 0.25 → "15 min"
 */
function formatHours(hours: number): string {
  return formatDurationDisplay(Math.round(hours * 60));
}

/**
 * Given a raw user input string, returns duration suggestions
 * interpreting the number as both minutes and hours.
 */
export function parseDurationSuggestions(input: string): DurationSuggestion[] {
  const trimmed = input.trim();
  if (trimmed === '') return [];

  // Reject strings that aren't valid numbers (parseFloat is too lenient, e.g. "12abc" → 12)
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return [];

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return [];

  const suggestions: DurationSuggestion[] = [];
  const seenMinutes = new Set<number>();

  // Interpret as minutes (round to integer)
  const asMinutes = Math.round(num);
  if (asMinutes >= 1 && asMinutes <= 1440) {
    suggestions.push({
      label: `${asMinutes} ${asMinutes === 1 ? 'minute' : 'minutes'}`,
      minutes: asMinutes,
    });
    seenMinutes.add(asMinutes);
  }

  // Interpret as hours (convert to minutes)
  const asHoursInMinutes = Math.round(num * 60);
  if (asHoursInMinutes >= 1 && !seenMinutes.has(asHoursInMinutes)) {
    suggestions.push({
      label: formatHours(num),
      minutes: asHoursInMinutes,
    });
  }

  return suggestions;
}

/**
 * Formats a minutes value into a compact human-readable string.
 * E.g., 30 → "30 min", 60 → "1 hr", 90 → "1 hr 30 min"
 */
export function formatDurationDisplay(minutes: number): string {
  if (minutes <= 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min`;
  const hrLabel = hours === 1 ? 'hr' : 'hrs';
  if (mins === 0) return `${hours} ${hrLabel}`;
  return `${hours} ${hrLabel} ${mins} min`;
}
