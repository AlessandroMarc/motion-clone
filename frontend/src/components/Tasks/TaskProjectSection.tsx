'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Folder, ExternalLink, X } from 'lucide-react';
import type { Task, Project } from '@/types';
import { taskService } from '@/services/taskService';
import { logger } from '@/lib/logger';
import { ProjectSelectionPopover } from './ProjectSelectionPopover';

interface TaskProjectSectionProps {
  task: Task;
  project?: Project;
  availableProjects: Project[];
  onTaskUpdate?: (updatedTask: Task, options?: { showToast?: boolean }) => void;
}

export function TaskProjectSection({
  task,
  project,
  availableProjects,
  onTaskUpdate,
}: TaskProjectSectionProps) {
  const [isLinkingProject, setIsLinkingProject] = useState(false);

  const handleProjectSelect = async (projectId: string) => {
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: projectId,
      });
      onTaskUpdate?.(updatedTask);
      setIsLinkingProject(false);
    } catch (error) {
      logger.error('Failed to link project:', error);
    }
  };

  const handleProjectUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: null,
      });
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      logger.error('Failed to unlink project:', error);
    }
  };

  if (isLinkingProject) {
    return (
      <ProjectSelectionPopover
        availableProjects={availableProjects}
        onProjectSelect={handleProjectSelect}
        onClose={() => setIsLinkingProject(false)}
      />
    );
  }

  if (project) {
    return (
      <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg overflow-hidden border border-border/50">
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{project.name}</span>
        </div>
        <div className="flex items-center border-l border-border/50">
          <Link
            href={`/projects/${project.id}`}
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 rounded-none text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleProjectUnlink}
            className="h-8 px-2 rounded-none text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={e => {
        e.stopPropagation();
        setIsLinkingProject(true);
      }}
      className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
    >
      <Folder className="h-3.5 w-3.5 mr-1.5" />
      Link to project
    </Button>
  );
}
