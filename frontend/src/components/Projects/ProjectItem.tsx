import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { StatusIcon } from '@/components/shared';
import Link from 'next/link';
import type { Project } from '@shared/types';
import type { ProjectSchedulingStatus } from '@/utils/projectSchedulingStatus';

interface ProjectItemProps {
  project: Project;
  schedulingStatus?: ProjectSchedulingStatus;
  onStatusToggle: (projectId: string, currentStatus: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectItem({
  project,
  schedulingStatus,
  onDelete,
}: ProjectItemProps) {
  const renderSchedulingIndicator = () => {
    if (!schedulingStatus || project.status === 'completed') {
      return null;
    }

    // If no incomplete tasks, nothing to show
    if (schedulingStatus.incompleteTasksCount === 0) {
      return null;
    }

    // All tasks scheduled and no violations
    if (schedulingStatus.allTasksScheduled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                On track
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tutte le task sono schedulate entro le deadline</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Has deadline violations
    if (schedulingStatus.hasDeadlineViolations) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                At risk
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alcune task sono schedulate dopo la deadline</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Some tasks not scheduled
    if (
      schedulingStatus.scheduledTasksCount <
      schedulingStatus.incompleteTasksCount
    ) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                <Clock className="h-3 w-3 mr-1" />
                {schedulingStatus.scheduledTasksCount}/
                {schedulingStatus.incompleteTasksCount} scheduled
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {schedulingStatus.incompleteTasksCount -
                  schedulingStatus.scheduledTasksCount}{' '}
                task non ancora schedulate
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return null;
  };

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
            {renderSchedulingIndicator()}

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
