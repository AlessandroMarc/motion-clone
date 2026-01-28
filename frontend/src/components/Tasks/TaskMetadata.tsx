'use client';

import {
  Calendar,
  AlertCircle,
  Clock,
  CalendarCheck,
  Folder,
} from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';

interface TaskMetadataProps {
  task: Task;
  project?: Project;
  isPlanned: boolean;
  taskIsOverdue: boolean;
  priorityConfig: { dotClass: string };
}

export function TaskMetadata({
  task,
  project,
  isPlanned,
  taskIsOverdue,
  priorityConfig,
}: TaskMetadataProps) {
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
