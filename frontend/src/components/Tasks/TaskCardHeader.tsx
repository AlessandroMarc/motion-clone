'use client';

import { Button } from '@/components/ui/button';
import { Trash2, CalendarPlus, GripVertical } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { isTaskCompleted, TASK_COMPLETED_CLASS } from '@/utils/taskUtils';
import { STATUS_CONFIG } from './taskCardConfig';

interface TaskCardHeaderProps {
  task: Task;
  showDragHandle: boolean;
  disabled: boolean;
  canSchedule: boolean;
  hasDelete: boolean;
  onSchedule?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCardHeader({
  task,
  showDragHandle,
  disabled,
  canSchedule,
  hasDelete,
  onSchedule,
  onDelete,
}: TaskCardHeaderProps) {
  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
  const StatusIcon = statusConfig.icon;
  const isCompleted = isTaskCompleted(task);

  return (
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
            isCompleted && TASK_COMPLETED_CLASS
          )}
        >
          {task.title}
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {canSchedule && onSchedule && (
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
        {hasDelete && onDelete && (
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
  );
}
