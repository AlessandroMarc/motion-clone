'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  CalendarCheck,
} from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  isTaskCompleted,
  isTaskOverdue,
  TASK_COMPLETED_CLASS,
  TASK_COMPLETED_OPACITY_CLASS,
} from '@/utils/taskUtils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './taskCardConfig';
import { TaskProjectSection } from './TaskProjectSection';

interface TaskItemProps {
  task: Task;
  project?: Project;
  availableProjects: Project[];
  onDelete: (taskId: string) => void;
  onTaskUpdate?: (updatedTask: Task, options?: { showToast?: boolean }) => void;
  isPlanned?: boolean;
  onSelect?: (task: Task) => void;
}

export function TaskItem({
  task,
  project,
  availableProjects,
  onDelete,
  onTaskUpdate,
  isPlanned = false,
  onSelect,
}: TaskItemProps) {
  const isCompleted = isTaskCompleted(task);
  const taskIsOverdue = isTaskOverdue(task);
  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
  const priorityConfig =
    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer',
        'border-l-[3px]',
        priorityConfig.borderClass,
        isCompleted && TASK_COMPLETED_OPACITY_CLASS
      )}
      onClick={() => onSelect?.(task)}
    >
      <div className="p-4">
        {/* Header: Title + Actions */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className={cn('mt-0.5', statusConfig.className)}>
              <StatusIcon
                className={cn(
                  'h-5 w-5',
                  task.status === 'in-progress' && 'animate-spin'
                )}
              />
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  'font-semibold text-base leading-tight',
                  isCompleted && TASK_COMPLETED_CLASS
                )}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap mt-3 pl-8">
          {/* Priority Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              priorityConfig.bgClass
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', priorityConfig.dotClass)} />
            {priorityConfig.label}
          </span>

          {/* Due Date */}
          {task.due_date && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                taskIsOverdue
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(task.due_date)}
              {taskIsOverdue && <AlertCircle className="h-3.5 w-3.5" />}
            </span>
          )}

          {/* Duration */}
          {task.planned_duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {task.planned_duration_minutes}m
              {task.actual_duration_minutes > 0 && (
                <span className="text-muted-foreground/70">
                  / {task.actual_duration_minutes}m
                </span>
              )}
            </span>
          )}

          {/* Planned in Calendar */}
          {isPlanned && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
              <CalendarCheck className="h-3.5 w-3.5" />
              Scheduled
            </span>
          )}
        </div>

        {/* Project Section */}
        <div className="mt-3 pl-8">
          <TaskProjectSection
            task={task}
            project={project}
            availableProjects={availableProjects}
            onTaskUpdate={onTaskUpdate}
          />
        </div>
      </div>
    </Card>
  );
}
