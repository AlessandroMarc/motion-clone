'use client';

import { useMemo } from 'react';
import { Folder, Inbox } from 'lucide-react';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import { groupTasksByProject } from '@/utils/taskUtils';
import { PROJECT_COLORS } from '@/utils/projectColors';
import { KanbanColumn } from './KanbanColumn';

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
}

export function ProjectKanbanBoard({
  tasks,
  projects,
  linkedTaskIds,
  onDeleteTask,
  onSelectTask,
  onToggleTaskCompletion,
  onTaskCreate,
}: ProjectKanbanBoardProps) {
  const tasksByProject = useMemo((): { unassigned: Task[] } & Record<
    string,
    Task[]
  > => {
    const { unassigned, byProject } = groupTasksByProject(tasks, projects);
    const byId = Object.fromEntries(
      byProject.map(({ project, tasks: t }) => [project.id, t])
    );
    const result: { unassigned: Task[] } & Record<string, Task[]> = {
      unassigned,
    };
    for (const p of projects) {
      result[p.id] = byId[p.id] ?? [];
    }
    return result;
  }, [tasks, projects]);

  return (
    <div
      className={cn(
        'flex gap-3 h-full overflow-x-auto pb-2',
        // Custom scrollbar styling
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40'
      )}
    >
      {/* Unassigned Column */}
      <KanbanColumn
        title="Unassigned"
        icon={<Inbox className="h-3.5 w-3.5 text-muted-foreground" />}
        tasks={tasksByProject.unassigned}
        linkedTaskIds={linkedTaskIds}
        projectId={null}
        onDeleteTask={onDeleteTask}
        onSelectTask={onSelectTask}
        onToggleTaskCompletion={onToggleTaskCompletion}
        onTaskCreate={onTaskCreate}
        color="bg-muted"
      />

      {/* Project Columns */}
      {projects.map((project, index) => (
        <KanbanColumn
          key={project.id}
          title={project.name}
          icon={<Folder className="h-3.5 w-3.5" />}
          tasks={tasksByProject[project.id] || []}
          linkedTaskIds={linkedTaskIds}
          projectId={project.id}
          onDeleteTask={onDeleteTask}
          onSelectTask={onSelectTask}
          onToggleTaskCompletion={onToggleTaskCompletion}
          onTaskCreate={onTaskCreate}
          color={PROJECT_COLORS[index % PROJECT_COLORS.length]}
        />
      ))}
    </div>
  );
}
