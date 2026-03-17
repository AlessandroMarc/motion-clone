import type { TaskFormData } from '@/hooks/useTaskForm';
import type { Task } from '@/types';
import { normalizeToMidnight, parseLocalDate } from './dateUtils';

/**
 * Transforms form data to task creation data
 */
export function transformFormDataToTask(
  data: TaskFormData,
  userId: string
): Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'> {
  const isReminder = data.is_reminder ?? false;
  const planned = isReminder ? 1 : Math.max(data.planned_duration_minutes, 0);
  const isRecurring = data.is_recurring ?? false;
  const actual = Math.min(
    Math.max(isRecurring || isReminder ? 0 : (data.actual_duration_minutes ?? 0), 0),
    planned
  );
  const transformed = {
    title: data.title,
    description: data.description || '',
    due_date:
      !isRecurring && data.dueDate
        ? normalizeToMidnight(parseLocalDate(data.dueDate))
        : null,
    priority: data.priority,
    project_id: data.project_id || undefined,
    user_id: userId,
    planned_duration_minutes: planned,
    actual_duration_minutes: actual,
    blockedBy: data.blockedBy || [],
    schedule_id: data.scheduleId || undefined,
    is_recurring: isRecurring,
    recurrence_pattern: isRecurring ? data.recurrence_pattern : undefined,
    recurrence_interval: isRecurring
      ? (data.recurrence_interval ?? 1)
      : undefined,
    recurrence_start_date:
      isRecurring && data.recurrenceStartDate
        ? normalizeToMidnight(parseLocalDate(data.recurrenceStartDate))
        : null,
    start_date: data.startDate
      ? normalizeToMidnight(parseLocalDate(data.startDate))
      : null,
    is_reminder: isReminder,
  };
  return transformed;
}

/**
 * Gets priority color class for UI display
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Gets priority display text
 */
export function getPriorityDisplayText(priority: string): string {
  switch (priority) {
    case 'high':
      return 'High Priority';
    case 'medium':
      return 'Medium Priority';
    case 'low':
      return 'Low Priority';
    default:
      return 'Unknown Priority';
  }
}

/**
 * Validates if a field has an error
 */
export function hasFieldError(errors: unknown, fieldName: string): boolean {
  return !!(errors && (errors as Record<string, unknown>)[fieldName]);
}

/**
 * Gets error message for a field
 */
export function getFieldError(
  errors: unknown,
  fieldName: string
): string | undefined {
  const error = (errors as Record<string, unknown>)?.[fieldName];
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message as string;
  }
  return undefined;
}
