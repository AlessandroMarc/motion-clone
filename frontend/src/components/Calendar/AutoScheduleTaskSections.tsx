'use client';

import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateUtils';
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '@/components/Tasks/taskCardConfig';

type TaskEventBlock = {
  task: Task;
  events: Array<{ start_time: Date; end_time: Date }>;
  violations: Array<{ start_time: Date; end_time: Date }>;
};

function TaskRow({
  task,
  eventsCount,
  violationsCount,
}: {
  task: Task;
  eventsCount: number;
  violationsCount?: number;
}) {
  const statusConfig =
    STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
  const priorityConfig =
    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
  const StatusIcon = statusConfig.icon;
  const hasViolations = violationsCount && violationsCount > 0;

  return (
    <div
      className={cn(
        'p-3 border rounded-lg border-l-[3px] transition-colors hover:bg-accent/30',
        priorityConfig.borderClass
      )}
    >
      <div className="flex items-start gap-2">
        {/* Status Icon */}
        <div className={cn('mt-0.5', statusConfig.className)}>
          <StatusIcon
            className={cn(
              'h-4 w-4',
              task.status === 'in-progress' && 'animate-spin'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm truncate">{task.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-xs font-normal">
                <ListChecks className="h-3 w-3 mr-1" />
                {eventsCount}
              </Badge>
              {hasViolations && (
                <Badge variant="destructive" className="text-xs font-normal">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {violationsCount} late
                </Badge>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            {/* Priority */}
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  priorityConfig.dotClass
                )}
              />
              {priorityConfig.label}
            </span>

            {/* Due Date */}
            {task.due_date && (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  hasViolations && 'text-red-500'
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutoScheduleTaskSections({
  taskEvents,
  tasksWithDeadlineCount,
  tasksWithoutDeadlineCount,
}: {
  taskEvents: TaskEventBlock[];
  tasksWithDeadlineCount: number;
  tasksWithoutDeadlineCount: number;
}) {
  const deadlineBlocks = taskEvents.filter(te => te.task.due_date !== null);
  const noDeadlineBlocks = taskEvents.filter(te => te.task.due_date === null);

  return (
    <>
      {tasksWithDeadlineCount > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Tasks with Deadline
            <Badge variant="outline" className="font-normal">
              {tasksWithDeadlineCount}
            </Badge>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {deadlineBlocks.map(({ task, events, violations }) => (
              <TaskRow
                key={task.id}
                task={task}
                eventsCount={events.length}
                violationsCount={violations.length}
              />
            ))}
          </div>
        </div>
      )}

      {tasksWithoutDeadlineCount > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            Tasks without Deadline
            <Badge variant="outline" className="font-normal">
              {tasksWithoutDeadlineCount}
            </Badge>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {noDeadlineBlocks.map(({ task, events }) => (
              <TaskRow key={task.id} task={task} eventsCount={events.length} />
            ))}
          </div>
        </div>
      )}

      {taskEvents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
          <p>All caught up!</p>
          <p className="text-xs mt-1">
            No events to create. All tasks are either completed or already
            scheduled.
          </p>
        </div>
      )}
    </>
  );
}
