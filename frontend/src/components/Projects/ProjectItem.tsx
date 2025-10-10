import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { StatusIcon } from '@/components/shared';
import Link from 'next/link';
import type { Project } from '@/../../../shared/types';

interface ProjectItemProps {
  project: Project;
  onStatusToggle: (projectId: string, currentStatus: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectItem({
  project,
  onStatusToggle,
  onDelete,
}: ProjectItemProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <StatusIcon status={project.status} type="project" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="block hover:text-primary transition-colors"
              >
                <h3
                  className={`text-sm font-medium ${
                    project.status === 'completed'
                      ? 'line-through text-muted-foreground'
                      : ''
                  }`}
                >
                  {project.name}
                </h3>
              </Link>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="capitalize">
                {project.status.replace('-', ' ')}
              </span>
            </div>

            {project.deadline && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue(project.deadline) && project.status !== 'completed'
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDate(project.deadline, false)}</span>
                {isOverdue(project.deadline) &&
                  project.status !== 'completed' && (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(project.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
