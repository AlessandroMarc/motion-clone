'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Folder } from 'lucide-react';
import type { Project } from '@/../../../shared/types';
import { projectService } from '@/services/projectService';
import {
  StatusGroupedList,
  EmptyStateCard,
  LoadingState,
  ErrorState,
} from '@/components/shared';
import { PROJECT_STATUS_CONFIG } from '@/utils/statusUtils';
import { ProjectItem } from './ProjectItem';

interface ProjectListProps {
  refreshTrigger?: number;
  onProjectUpdate?: () => void;
}

export function ProjectList({
  refreshTrigger,
  onProjectUpdate,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProjects = await projectService.getAllProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const handleStatusToggle = async (
    projectId: string,
    currentStatus: string
  ) => {
    try {
      const newStatus =
        currentStatus === 'completed' ? 'not-started' : 'completed';
      await projectService.updateProject(projectId, {
        status: newStatus as 'not-started' | 'in-progress' | 'completed',
      });
      await fetchProjects();
      onProjectUpdate?.();
      toast.success(`Project marked as ${newStatus.replace('-', ' ')}`);
    } catch (err) {
      console.error('Failed to update project status:', err);
      toast.error('Failed to update project status');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await projectService.deleteProject(projectId);
      await fetchProjects();
      onProjectUpdate?.();
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Failed to delete project:', err);
      toast.error('Failed to delete project');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading projects..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading projects"
        message={error}
        onRetry={fetchProjects}
      />
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Create your first project to organize your larger goals and
            milestones.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <StatusGroupedList
      items={projects}
      statusConfig={PROJECT_STATUS_CONFIG}
      getItemStatus={project => project.status}
      renderItem={project => (
        <ProjectItem
          key={project.id}
          project={project}
          onStatusToggle={handleStatusToggle}
          onDelete={handleDeleteProject}
        />
      )}
      renderEmptyState={statusConfig => (
        <EmptyStateCard
          key={statusConfig.key}
          statusConfig={statusConfig}
          message={`No ${statusConfig.label.toLowerCase()} projects`}
        />
      )}
    />
  );
}
