'use client';

import { useMemo } from 'react';
import { Folder, Inbox } from 'lucide-react';
import type { Task, Project } from '@shared/types';
import { cn } from '@/lib/utils';
import { KanbanColumn } from './KanbanColumn';

interface ProjectKanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  linkedTaskIds: Set<string>;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onQuickCreateTask: (title: string, projectId: string | null) => Promise<void>;
}

// Generate a color for project based on index
const PROJECT_COLORS = [
  'bg-blue-500/20 text-blue-600',
  'bg-purple-500/20 text-purple-600',
  'bg-green-500/20 text-green-600',
  'bg-orange-500/20 text-orange-600',
  'bg-pink-500/20 text-pink-600',
  'bg-cyan-500/20 text-cyan-600',
  'bg-yellow-500/20 text-yellow-600',
  'bg-red-500/20 text-red-600',
];

export function ProjectKanbanBoard({
  tasks,
  projects,
  linkedTaskIds,
  onDeleteTask,
  onSelectTask,
  onQuickCreateTask,
}: ProjectKanbanBoardProps) {
  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const groups: Record<string, Task[]> = {
      unassigned: [],
    };

    // Initialize groups for all projects
    for (const project of projects) {
      groups[project.id] = [];
    }

    // Group tasks
    for (const task of tasks) {
      if (task.project_id && groups[task.project_id]) {
        groups[task.project_id].push(task);
      } else {
        groups.unassigned.push(task);
      }
    }

    return groups;
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
        onQuickCreateTask={onQuickCreateTask}
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
          onQuickCreateTask={onQuickCreateTask}
          color={PROJECT_COLORS[index % PROJECT_COLORS.length]}
        />
      ))}
    </div>
  );
}
