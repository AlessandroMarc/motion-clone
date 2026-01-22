'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  CalendarCheck,
  CalendarPlus,
  GripVertical,
  Folder,
} from 'lucide-react';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import type { Task, Project } from '@shared/types';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './taskCardConfig';

// Re-export config for backwards compatibility
export { STATUS_CONFIG, PRIORITY_CONFIG };

interface CompactTaskCardProps {
  task: Task;
  isPlanned?: boolean;
  onSelect?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onSchedule?: (task: Task) => void;
  project?: Project;
  showDragHandle?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
  disabled?: boolean;
}

export function CompactTaskCard({
  task,
  isPlanned = false,
  onSelect,
  onDelete,
  onSchedule,
  project,
  showDragHandle = false,
  draggable = false,
  onDragStart,
  className,
  disabled = false,
}: CompactTaskCardProps) {
  const isCompleted = task.status === 'completed';
  const taskIsOverdue = task.due_date && isOverdue(task.due_date) && !isCompleted;
  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG['pending'];
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
  const StatusIcon = statusConfig.icon;
  const canSchedule = onSchedule && !isPlanned && !isCompleted;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'border-l-2',
        priorityConfig.borderClass,
        isCompleted && 'opacity-60',
        disabled
          ? 'opacity-50 cursor-default'
          : draggable
            ? 'cursor-grab active:cursor-grabbing hover:shadow-sm'
            : onSelect
              ? 'cursor-pointer hover:shadow-sm'
              : '',
        className
      )}
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onClick={() => !disabled && onSelect?.(task)}
    >
      <div className="p-1.5">
        {/* Header: Title + Actions */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            {showDragHandle && !disabled && (
              <div className="mt-px opacity-0 group-hover:opacity-40 transition-opacity shrink-0">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <div className={cn('mt-px shrink-0', statusConfig.className)}>
              <StatusIcon
                className={cn(
                  'h-3 w-3',
                  task.status === 'in-progress' && 'animate-spin'
                )}
              />
            </div>
            <h3
              className={cn(
                'font-medium text-[11px] leading-tight line-clamp-2',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {canSchedule && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedule(task);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Schedule task"
              >
                <CalendarPlus className="h-2.5 w-2.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete task"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <TaskMetadata
          task={task}
          project={project}
          isPlanned={isPlanned}
          taskIsOverdue={taskIsOverdue}
          priorityConfig={priorityConfig}
        />
      </div>
    </Card>
  );
}

// --- Subcomponent for metadata ---

interface TaskMetadataProps {
  task: Task;
  project?: Project;
  isPlanned: boolean;
  taskIsOverdue: boolean;
  priorityConfig: { dotClass: string };
}

function TaskMetadata({ task, project, isPlanned, taskIsOverdue, priorityConfig }: TaskMetadataProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1 pl-4">
      {/* Priority Dot */}
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
        <span className={cn('h-1 w-1 rounded-full', priorityConfig.dotClass)} />
        {task.priority}
      </span>

      {/* Due Date */}
      {task.due_date && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[9px]',
            taskIsOverdue
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'
          )}
        >
          <Calendar className="h-2 w-2" />
          {formatDate(task.due_date)}
          {taskIsOverdue && <AlertCircle className="h-2 w-2" />}
        </span>
      )}

      {/* Duration */}
      {task.planned_duration_minutes > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
          <Clock className="h-2 w-2" />
          {task.planned_duration_minutes}m
        </span>
      )}

      {/* Project */}
      {project && (
        <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground truncate">
          <Folder className="h-2 w-2 shrink-0" />
          <span className="truncate">{project.name}</span>
        </span>
      )}

      {/* Planned in Calendar */}
      {isPlanned && (
        <span className="inline-flex items-center gap-0.5 text-[9px] text-primary">
          <CalendarCheck className="h-2 w-2" />
          <span>Scheduled</span>
        </span>
      )}
    </div>
  );
}
