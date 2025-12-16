import type {
  CalendarEventTask,
  CalendarEventUnion,
  Task,
} from '@shared/types';
import { isCalendarEventTask } from '@shared/types';

type UnknownRecord = Record<string, any>;

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(value as any);
}

export function toOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  return toDate(value);
}

export function toTask(raw: UnknownRecord): Task {
  return {
    ...raw,
    due_date: toOptionalDate(raw.due_date),
    created_at: toDate(raw.created_at),
    updated_at: toDate(raw.updated_at),
    planned_duration_minutes: raw.planned_duration_minutes,
    actual_duration_minutes: raw.actual_duration_minutes,
    blockedBy: raw.blocked_by || [],
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
      completed_at: toOptionalDate((raw as any).completed_at),
    } as CalendarEventTask;
  }

  return base;
}

export function toCalendarEventUnions(
  raw: UnknownRecord[]
): CalendarEventUnion[] {
  return raw.map(toCalendarEventUnion);
}
