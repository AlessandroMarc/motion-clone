/**
 * Shared task priority constants and comparison utilities.
 * Used by both frontend (sorting/display) and backend (scheduling).
 */
import type { Task } from './types.js';

type TaskPriority = Task['priority'];

/** Priority rank for sorting (high first): higher number = higher priority. */
export const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Comparator for sorting tasks by priority (high first). Use with Array.prototype.sort. */
export function compareTaskPriority(
  a: { priority: TaskPriority },
  b: { priority: TaskPriority }
): number {
  return (
    (TASK_PRIORITY_RANK[b.priority] ?? 0) -
    (TASK_PRIORITY_RANK[a.priority] ?? 0)
  );
}

/** Returns a new array sorted by priority (high first). */
export function sortByPriority<T extends { priority: TaskPriority }>(
  items: T[]
): T[] {
  return [...items].sort(compareTaskPriority);
}
