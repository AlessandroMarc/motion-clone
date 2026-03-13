/**
 * Shared validation constants for task and project entities.
 * Used by frontend (Zod schemas) and backend (input validation).
 */

export const TASK_TITLE_MAX_LENGTH = 100;
export const TASK_TITLE_MIN_LENGTH = 1;
export const TASK_DESCRIPTION_MAX_LENGTH = 4000;
export const TASK_DURATION_MIN_MINUTES = 1;
export const TASK_RECURRENCE_INTERVAL_MIN = 1;

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const RECURRENCE_PATTERNS = ['daily', 'weekly', 'monthly'] as const;
export type RecurrencePatternValue = (typeof RECURRENCE_PATTERNS)[number];

export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 4000;

/**
 * Validate a task title. Returns an error message or null if valid.
 */
export function validateTaskTitle(title: string): string | null {
  if (!title || title.length < TASK_TITLE_MIN_LENGTH) {
    return 'Title is required';
  }
  if (title.length > TASK_TITLE_MAX_LENGTH) {
    return `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate a task description. Returns an error message or null if valid.
 */
export function validateTaskDescription(description: string): string | null {
  if (description.length > TASK_DESCRIPTION_MAX_LENGTH) {
    return `Description must be at most ${TASK_DESCRIPTION_MAX_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate task priority. Returns an error message or null if valid.
 */
export function validateTaskPriority(priority: string): string | null {
  if (!TASK_PRIORITIES.includes(priority as TaskPriorityValue)) {
    return `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`;
  }
  return null;
}

/**
 * Validate planned duration. Returns an error message or null if valid.
 */
export function validatePlannedDuration(minutes: number): string | null {
  if (minutes < TASK_DURATION_MIN_MINUTES) {
    return `Planned duration must be at least ${TASK_DURATION_MIN_MINUTES} minute`;
  }
  return null;
}
