import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { isTaskCompleted } from '@/utils/taskUtils';
import type { Task } from '@/types';

interface DueDateDisplayProps {
  task: Task;
}

export function DueDateDisplay({ task }: DueDateDisplayProps): React.ReactElement {
  if (!task.due_date) return <span className="text-xs text-muted-foreground">-</span>;
  const dueDate = new Date(task.due_date);
  const now = new Date();
  const isCompleted = isTaskCompleted(task);
  const isOverdue = dueDate < now && !isCompleted;
  return (
    <span className={cn('text-xs', isOverdue && 'text-red-600 font-medium')}>
      {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
      {formatDistanceToNow(dueDate, { addSuffix: true })}
    </span>
  );
}
