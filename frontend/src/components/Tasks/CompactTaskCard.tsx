'use client';

import { Card } from '@/components/ui/card';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  isTaskCompleted,
  isTaskOverdue,
  TASK_COMPLETED_OPACITY_CLASS,
} from '@/utils/taskUtils';
import { PRIORITY_CONFIG } from './taskCardConfig';
import { TaskCardHeader } from './TaskCardHeader';
import { TaskMetadata } from './TaskMetadata';

// Re-export config for backwards compatibility
export { STATUS_CONFIG, PRIORITY_CONFIG } from './taskCardConfig';

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
  const isCompleted = isTaskCompleted(task);
  const taskIsOverdue = isTaskOverdue(task);
  const priorityConfig =
    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
  const canSchedule = Boolean(onSchedule && !isPlanned && !isCompleted);

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'border-l-2',
        priorityConfig.borderClass,
        isCompleted && TASK_COMPLETED_OPACITY_CLASS,
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
        <TaskCardHeader
          task={task}
          showDragHandle={showDragHandle}
          disabled={disabled}
          canSchedule={canSchedule}
          hasDelete={Boolean(onDelete)}
          onSchedule={onSchedule}
          onDelete={onDelete}
        />

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
