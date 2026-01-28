import type { Task, Project } from '@/types';
import { isOverdue } from '@/utils/dateUtils';

/** Whether the task is in completed status. */
export function isTaskCompleted(task: { status: string }): boolean {
  return task.status === 'completed';
}

/** Whether the task has a due date that is past and the task is not completed. */
export function isTaskOverdue(task: {
  due_date: Date | string | null;
  status: string;
}): boolean {
  return !!(
    task.due_date &&
    isOverdue(task.due_date) &&
    !isTaskCompleted(task)
  );
}

/** Standard Tailwind classes for completed task text (strikethrough + muted). */
export const TASK_COMPLETED_CLASS = 'line-through text-muted-foreground';

/** Optional class for completed card opacity. */
export const TASK_COMPLETED_OPACITY_CLASS = 'opacity-60';

export function getTaskCompletedClassName(): string {
  return TASK_COMPLETED_CLASS;
}

/** Priority rank for sorting (high first): higher number = higher priority. */
export const TASK_PRIORITY_RANK: Record<Task['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Comparator for sorting tasks by priority (high first). Use with Array.prototype.sort. */
export function compareTaskPriority(a: Task, b: Task): number {
  return (
    (TASK_PRIORITY_RANK[b.priority] ?? 0) -
    (TASK_PRIORITY_RANK[a.priority] ?? 0)
  );
}

/** Returns a new array of tasks sorted by priority (high first). */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTaskPriority);
}

export interface GroupTasksByProjectResult {
  unassigned: Task[];
  byProject: { project: Project; tasks: Task[] }[];
}

/** Group tasks into unassigned and per-project. byProject only includes projects that have at least one task. */
export function groupTasksByProject(
  tasks: Task[],
  projects: Project[]
): GroupTasksByProjectResult {
  const unassigned = tasks.filter(t => !t.project_id);
  const byProject = projects
    .map(project => ({
      project,
      tasks: tasks.filter(t => t.project_id === project.id),
    }))
    .filter(({ tasks: t }) => t.length > 0);
  return { unassigned, byProject };
}
