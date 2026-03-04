import type { CalendarEventTask, CalendarEventUnion, Task } from '@/types';
import { isCalendarEventTask } from '@/types';
import { parseLocalDate } from '@/utils/dateUtils';

export type UnknownRecord = Record<string, unknown>;

/** Regex for plain date strings returned by Supabase DATE columns: "YYYY-MM-DD" */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    // Parse date-only strings in local timezone to avoid UTC-midnight day shift
    // for users in UTC+ timezones (e.g. new Date("2026-03-04") → March 3 in UTC+1).
    if (ISO_DATE_ONLY.test(value)) return parseLocalDate(value);
    return new Date(value);
  }
  if (typeof value === 'number') return new Date(value);
  return new Date(String(value));
}

export function toOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  return toDate(value);
}

export function toTask(raw: UnknownRecord): Task {
  if (typeof raw.schedule_id !== 'string' || raw.schedule_id.length === 0) {
    throw new Error(
      `Invalid task payload: schedule_id must be a non-empty string, got ${JSON.stringify(raw.schedule_id)}`
    );
  }

  return {
    ...raw,
    due_date: toOptionalDate(raw.due_date),
    created_at: toDate(raw.created_at),
    updated_at: toDate(raw.updated_at),
    schedule_id: raw.schedule_id,
    planned_duration_minutes: raw.planned_duration_minutes,
    actual_duration_minutes: raw.actual_duration_minutes,
    blockedBy: raw.blocked_by || [],
    recurrence_start_date: toOptionalDate(raw.recurrence_start_date),
    next_generation_cutoff: toOptionalDate(raw.next_generation_cutoff),
  } as Task;
}

export function toTasks(raw: UnknownRecord[]): Task[] {
  return raw.map(toTask);
}

export function toCalendarEventUnion(raw: UnknownRecord): CalendarEventUnion {
  const base = {
    ...raw,
    start_time: toDate(raw.start_time),
    end_time: toDate(raw.end_time),
    created_at: toDate(raw.created_at),
    updated_at: toDate(raw.updated_at),
  } as CalendarEventUnion;

  if (isCalendarEventTask(base)) {
    return {
      ...base,
      completed_at: toOptionalDate(raw.completed_at),
    } as CalendarEventTask;
  }

  return base;
}

export function toCalendarEventUnions(
  raw: UnknownRecord[]
): CalendarEventUnion[] {
  return raw.map(toCalendarEventUnion);
}
