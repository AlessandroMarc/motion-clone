'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { ProjectEditDialog } from './ProjectEditDialog';
import type { Project } from '@shared/types';

interface ProjectDetailViewProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

export function ProjectDetailView({
  project,
  onProjectUpdate,
}: ProjectDetailViewProps) {
  return (
    <Card className="p-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Project Details</CardTitle>
          <ProjectEditDialog
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-6 py-6">
        {/* Project Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Project Name</label>
          <p className="text-lg font-medium">{project.name}</p>
        </div>

        {/* Project Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <p className="text-muted-foreground">
            {project.description || 'No description provided'}
          </p>
        </div>

        {/* Project Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <div className="flex items-center gap-2">
            <span className="capitalize px-2 py-1 bg-secondary rounded-md text-sm">
              {project.status.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Project Deadline */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Deadline</label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {project.deadline
                ? formatDate(project.deadline, false)
                : 'No deadline set'}
            </span>
          </div>
        </div>

        {/* Project Metadata */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDate(project.createdAt, false)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {formatDate(project.updatedAt, false)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
