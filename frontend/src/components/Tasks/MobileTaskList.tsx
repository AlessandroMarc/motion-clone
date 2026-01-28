'use client';

import React, { useMemo } from 'react';
import { Folder, Inbox } from 'lucide-react';
import Link from 'next/link';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  groupTasksByProject,
  isTaskCompleted,
  TASK_COMPLETED_CLASS,
} from '@/utils/taskUtils';
import { STATUS_CONFIG } from './taskCardConfig';

interface MobileTaskListRowProps {
  task: Task;
  onSelect: (task: Task) => void;
}

function MobileTaskListRow({
  task,
  onSelect,
}: MobileTaskListRowProps): React.ReactElement {
  const statusConfig =
    STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
  const StatusIcon = statusConfig.icon;
  const isCompleted = isTaskCompleted(task);

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={cn(
        'flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg',
        'hover:bg-muted/50 active:bg-muted transition-colors',
        'border-b border-border/50 last:border-b-0'
      )}
    >
      <span className={cn('shrink-0', statusConfig.className)}>
        <StatusIcon
          className={cn(
            'h-4 w-4',
            task.status === 'in-progress' && 'animate-spin'
          )}
        />
      </span>
      <span
        className={cn(
          'flex-1 min-w-0 font-medium text-sm truncate',
          isCompleted && TASK_COMPLETED_CLASS
        )}
      >
        {task.title}
      </span>
    </button>
  );
}

interface TaskGroup {
  id: string | null;
  label: string;
  projectId: string | null;
  tasks: Task[];
}

export interface MobileTaskListProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function MobileTaskList({
  tasks,
  projects,
  onSelectTask,
}: MobileTaskListProps): React.ReactElement {
  const groups = useMemo((): TaskGroup[] => {
    const { unassigned, byProject } = groupTasksByProject(tasks, projects);
    const result: TaskGroup[] = [];
    if (unassigned.length > 0) {
      result.push({
        id: null,
        label: 'Unassigned',
        projectId: null,
        tasks: unassigned,
      });
    }
    for (const { project, tasks: projectTasks } of byProject) {
      result.push({
        id: project.id,
        label: project.name,
        projectId: project.id,
        tasks: projectTasks,
      });
    }
    return result;
  }, [tasks, projects]);

  return (
    <div className="flex flex-col overflow-y-auto py-1 -mx-1 gap-4">
      {groups.map(group => (
        <section key={group.id ?? 'unassigned'}>
          <div className="flex items-center gap-2 px-3 mb-1.5">
            <span className="text-muted-foreground shrink-0">
              {group.projectId ? (
                <Folder className="h-3.5 w-3.5" />
              ) : (
                <Inbox className="h-3.5 w-3.5" />
              )}
            </span>
            {group.projectId ? (
              <Link
                href={`/projects/${group.projectId}`}
                className=" font-semibold text-foreground truncate hover:underline"
              >
                {group.label}
              </Link>
            ) : (
              <span className=" font-semibold text-muted-foreground truncate">
                {group.label}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {group.tasks.length}
            </span>
          </div>
          <div className="flex flex-col rounded-lg border border-border/50 overflow-hidden">
            {group.tasks.map(task => (
              <MobileTaskListRow
                key={task.id}
                task={task}
                onSelect={onSelectTask}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
