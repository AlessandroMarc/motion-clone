'use client';

import { useState, useCallback, useMemo } from 'react';
import { Circle, Clock, CheckCircle2, Layers } from 'lucide-react';
import type { Task, Project, WorkItemStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { groupTasksByProject } from '@/utils/taskUtils';
import { getProjectColorIndex } from '@/utils/projectColors';
import { parseLocalDate, toLocalDateString } from '@/utils/dateUtils';
import { KanbanColumn, type TaskGroup } from './KanbanColumn';

// Dot colors for project group headers (must be static for Tailwind JIT)
const PROJECT_DOT_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-rose-500',
] as const;

const STATUS_COLUMNS: Array<{
  status: WorkItemStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    status: 'not-started',
    title: 'Not Started',
    icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
    color: 'bg-muted',
  },
  {
    status: 'in-progress',
    title: 'In Progress',
    icon: <Clock className="h-3.5 w-3.5 text-blue-500" />,
    color: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    status: 'completed',
    title: 'Completed',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    color: 'bg-green-100 dark:bg-green-950',
  },
];

function sortByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    const aDateStr = a.due_date instanceof Date
      ? toLocalDateString(a.due_date)
      : String(a.due_date);
    const bDateStr = b.due_date instanceof Date
      ? toLocalDateString(b.due_date)
      : String(b.due_date);

    return parseLocalDate(aDateStr).getTime() - parseLocalDate(bDateStr).getTime();
  });
}

interface ProjectKanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  linkedTaskIds: Set<string>;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  onTaskStatusChange: (task: Task, newStatus: WorkItemStatus) => Promise<void>;
}

export function ProjectKanbanBoard({
  tasks,
  projects,
  linkedTaskIds,
  onDeleteTask,
  onSelectTask,
  onToggleTaskCompletion,
  onTaskCreate,
  onTaskStatusChange,
}: ProjectKanbanBoardProps) {
  const [groupByProject, setGroupByProject] = useState(false);

  const tasksByStatus = useMemo(() => {
    const map: Record<WorkItemStatus, Task[]> = {
      'not-started': [],
      'in-progress': [],
      completed: [],
    };
    for (const task of tasks) {
      const status = (task.status as WorkItemStatus) ?? 'not-started';
      (map[status] ??= []).push(task);
    }
    for (const status of Object.keys(map) as WorkItemStatus[]) {
      map[status] = sortByDeadline(map[status]);
    }
    return map;
  }, [tasks]);

  const groupsByStatus = useMemo((): Record<
    WorkItemStatus,
    TaskGroup[]
  > | null => {
    if (!groupByProject) return null;

    const result = {} as Record<WorkItemStatus, TaskGroup[]>;

    for (const { status } of STATUS_COLUMNS) {
      const statusTasks = tasksByStatus[status];
      const { unassigned, byProject } = groupTasksByProject(
        statusTasks,
        projects
      );

      const groups: TaskGroup[] = [
        ...byProject.map(({ project, tasks: t }) => {
          const colorIdx = getProjectColorIndex(project.id);
          return {
            label: project.name,
            projectId: project.id,
            tasks: t,
            color: PROJECT_DOT_COLORS[colorIdx % PROJECT_DOT_COLORS.length],
          };
        }),
        ...(unassigned.length > 0 || byProject.length === 0
          ? [{ label: 'Unassigned', projectId: null, tasks: unassigned }]
          : []),
      ];

      result[status] = groups;
    }

    return result;
  }, [groupByProject, tasksByStatus, projects]);

  const handleDrop = useCallback(
    async (taskId: string, newStatus: WorkItemStatus) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.status === newStatus) return;
      await onTaskStatusChange(task, newStatus);
    },
    [tasks, onTaskStatusChange]
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant={groupByProject ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGroupByProject(v => !v)}
          className="gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          Group by project
        </Button>
      </div>

      {/* Status columns */}
      <div
        className={cn(
          'flex gap-3 flex-1 overflow-x-auto pb-2',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40'
        )}
      >
        {STATUS_COLUMNS.map(({ status, title, icon, color }) => (
          <KanbanColumn
            key={status}
            title={title}
            icon={icon}
            tasks={tasksByStatus[status]}
            linkedTaskIds={linkedTaskIds}
            projectId={null}
            onDeleteTask={onDeleteTask}
            onSelectTask={onSelectTask}
            onToggleTaskCompletion={onToggleTaskCompletion}
            onTaskCreate={onTaskCreate}
            color={color}
            onDropTask={taskId => void handleDrop(taskId, status)}
            groups={groupsByStatus?.[status]}
          />
        ))}
      </div>
    </div>
  );
}