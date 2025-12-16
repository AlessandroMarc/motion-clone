import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, Timer } from 'lucide-react';
import { getPriorityColor } from '@/utils/statusUtils';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { taskService } from '@/services/taskService';
import { TaskProjectSection } from './TaskProjectSection';
import type { Task, Project } from '@shared/types';
import { logger } from '@/lib/logger';

interface TaskItemProps {
  task: Task;
  project?: Project;
  availableProjects: Project[];
  onDelete: (taskId: string) => void;
  onTaskUpdate?: (updatedTask: Task, options?: { showToast?: boolean }) => void;
  isPlanned?: boolean;
  onSelect?: (task: Task) => void;
}

const STATUS_BADGE_STYLES: Record<
  Task['status'],
  { label: string; className: string }
> = {
  'not-started': {
    label: 'Not Started',
    className: 'bg-muted text-muted-foreground',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

export function TaskItem({
  task,
  project,
  availableProjects,
  onDelete,
  onTaskUpdate,
  isPlanned = false,
  onSelect,
}: TaskItemProps) {
  const handleProjectSelect = async (projectId: string) => {
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: projectId,
      });
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      logger.error('Failed to link project:', error);
    }
  };

  const handleProjectUnlink = async () => {
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: null,
      });
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      logger.error('Failed to unlink project:', error);
    }
  };
  return (
    <Card
      className="hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onSelect?.(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium ${
                  task.status === 'completed'
                    ? 'line-through text-muted-foreground'
                    : ''
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {task.description}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <TaskProjectSection
                  project={project}
                  availableProjects={availableProjects}
                  onProjectSelect={handleProjectSelect}
                  onProjectUnlink={handleProjectUnlink}
                />
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                >
                  <Timer className="h-3 w-3" />
                  Planned: {task.planned_duration_minutes}m
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                >
                  <Timer className="h-3 w-3" />
                  Actual: {task.actual_duration_minutes}m
                </Badge>
                {isPlanned && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    Planned in calendar
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0.5 ${STATUS_BADGE_STYLES[task.status]?.className ?? ''}`}
                >
                  {STATUS_BADGE_STYLES[task.status]?.label ?? task.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}
            />
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {task.priority}
            </Badge>

            {task.due_date && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue(task.due_date) && task.status !== 'completed'
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
                onClick={event => event.stopPropagation()}
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.due_date)}</span>
                {isOverdue(task.due_date) && task.status !== 'completed' && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={event => {
                event.stopPropagation();
                onDelete(task.id);
              }}
              className="cursor-pointer text-red-600 bg-red-50 hover:text-red-50 hover:bg-red-800 h-7 px-2 text-xs"
            >
              X
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
