import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, AlertCircle, Timer } from 'lucide-react';
import { getPriorityColor } from '@/utils/statusUtils';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { taskService } from '@/services/taskService';
import { TaskProjectSection } from './TaskProjectSection';
import type { Task, Project } from '@/../../../shared/types';

interface TaskItemProps {
  task: Task;
  project?: Project;
  availableProjects: Project[];
  onStatusToggle: (taskId: string, currentStatus: string) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdate?: (updatedTask: Task) => void;
  isPlanned?: boolean;
}

export function TaskItem({
  task,
  project,
  availableProjects,
  onStatusToggle,
  onDelete,
  onTaskUpdate,
  isPlanned = false,
}: TaskItemProps) {
  console.log('TaskItem rendered:', {
    taskId: task.id,
    projectId: task.project_id,
    project,
  });

  const handleProjectSelect = async (projectId: string) => {
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: projectId,
      });
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      console.error('Failed to link project:', error);
    }
  };

  const handleProjectUnlink = async () => {
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        project_id: null,
      });
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      console.error('Failed to unlink project:', error);
    }
  };
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={() => onStatusToggle(task.id, task.status)}
              className="flex-shrink-0"
            />
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
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Planned: {task.planned_duration_minutes}m
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Actual: {task.actual_duration_minutes}m
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
              onClick={() => onDelete(task.id)}
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
