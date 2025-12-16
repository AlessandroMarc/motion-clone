'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import type { Task } from '@shared/types';

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
  return (
    <div className="p-3 border rounded-lg space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{task.title}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {eventsCount} events
          </Badge>
          {violationsCount && violationsCount > 0 ? (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {violationsCount} after deadline
            </Badge>
          ) : null}
        </div>
      </div>
      {task.due_date ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      ) : null}
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
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            Tasks with Deadline ({tasksWithDeadlineCount})
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
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            Tasks without Deadline ({tasksWithoutDeadlineCount})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {noDeadlineBlocks.map(({ task, events }) => (
              <TaskRow key={task.id} task={task} eventsCount={events.length} />
            ))}
          </div>
        </div>
      )}

      {taskEvents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No events to create. All tasks are either completed or already fully
          scheduled.
        </div>
      )}
    </>
  );
}


