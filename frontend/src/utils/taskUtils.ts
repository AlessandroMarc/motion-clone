import type { Task, Project } from '@/types';
import { isOverdue } from '@/utils/dateUtils';

// Re-export shared priority utilities so existing imports keep working
export {
  TASK_PRIORITY_RANK,
  compareTaskPriority,
  sortByPriority as sortTasksByPriority,
} from '@shared/taskPriority';

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

interface GroupTasksByProjectResult {
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
