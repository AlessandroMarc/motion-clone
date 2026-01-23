'use client';

import { useState, useMemo } from 'react';
import type { CalendarEventUnion, Task } from '@shared/types';
import { isCalendarEventTask } from '@shared/types';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeadlineViolationsBarProps {
  events: CalendarEventUnion[];
  tasksMap: Map<string, Task>;
}

interface Violation {
  task: Task;
  event: CalendarEventUnion;
  deadline: Date;
  scheduledTime: Date;
}

export function DeadlineViolationsBar({
  events,
  tasksMap,
}: DeadlineViolationsBarProps) {
  const violations = useMemo(() => {
    const violationsList: Violation[] = [];

    for (const event of events) {
      if (!isCalendarEventTask(event) || !event.linked_task_id) {
        continue;
      }

      const task = tasksMap.get(event.linked_task_id);
      if (!task || !task.due_date) {
        continue;
      }

      const eventStart = new Date(event.start_time);
      const deadline = new Date(task.due_date);
      deadline.setHours(23, 59, 59, 999);

      if (eventStart > deadline) {
        violationsList.push({
          task,
          event,
          deadline,
          scheduledTime: eventStart,
        });
      }
    }

    return violationsList;
  }, [events, tasksMap]);

  if (violations.length === 0) {
    return null;
  }

  const uniqueTasks = new Map<string, Violation>();
  for (const violation of violations) {
    if (!uniqueTasks.has(violation.task.id)) {
      uniqueTasks.set(violation.task.id, violation);
    }
  }

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {uniqueTasks.size} task{uniqueTasks.size > 1 ? 's' : ''} scheduled
              after deadline
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
          >
            {isExpanded ? (
              <>
                <X className="h-3 w-3 mr-1" />
                Hide
              </>
            ) : (
              'Show details'
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {Array.from(uniqueTasks.values()).map(violation => (
              <div
                key={violation.task.id}
                className="bg-yellow-100/50 dark:bg-yellow-900/30 rounded-md p-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      {violation.task.title}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                      Deadline:{' '}
                      {violation.deadline.toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      {' • '}
                      Scheduled:{' '}
                      {violation.scheduledTime.toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      {violation.scheduledTime.toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
