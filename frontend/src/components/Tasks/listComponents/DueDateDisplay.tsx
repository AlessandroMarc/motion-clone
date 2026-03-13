import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTaskCompleted } from '@/utils/taskUtils';
import { parseLocalDate } from '@/utils/dateUtils';
import type { Task } from '@/types';

interface DueDateDisplayProps {
  task: Task;
  // Optional next scheduled session date (if any)
  nextSessionDate?: Date | null;
  // Optional earliest allowed start date for the task
  startDate?: Date | null;
}

/**
 * Get the start of day (midnight) for a date in local timezone.
 * Used for date-only comparisons.
 */
function getLocalDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a due date for display. Returns "Today", "Tomorrow", "Yesterday",
 * or the actual date (e.g., "Mar 5").
 */
function formatDueDate(dueDate: Date): string {
  const today = getLocalDayStart(new Date());
  const dueDateStart = getLocalDayStart(dueDate);
  const daysDiff = Math.floor(
    (dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff === -1) return 'Yesterday';

  // Format as "Mar 5" or "Mar 5, 2027" if not current year
  const currentYear = new Date().getFullYear();
  const dueYear = dueDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(dueYear !== currentYear && { year: 'numeric' }),
  };
  return dueDate.toLocaleDateString(undefined, options);
}

export function DueDateDisplay({
  task,
  nextSessionDate,
  startDate,
}: DueDateDisplayProps): React.ReactElement {
  const dueDate = task.due_date
    ? typeof task.due_date === 'string'
      ? parseLocalDate(task.due_date)
      : new Date(task.due_date)
    : null;
  const today = getLocalDayStart(new Date());
  const dueDateStart = dueDate ? getLocalDayStart(dueDate) : null;
  const isCompleted = isTaskCompleted(task);
  const isOverdue = dueDateStart ? dueDateStart < today && !isCompleted : false;

  // Only show the deadline display if the task has a due date.
  // Prefer showing next scheduled session; otherwise fall back to start date.
  const parts: string[] = [];

  if (dueDate) {
    parts.push(`By ${formatDueDate(dueDate)}`);
  }

  if (nextSessionDate) {
    parts.push(`On ${formatDueDate(nextSessionDate)}`);
  } else if (!dueDate && startDate) {
    parts.push(`On ${formatDueDate(startDate)}`);
  }

  if (parts.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <span className={cn('text-xs', isOverdue && 'text-red-600 font-medium')}>
      {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
      {parts.join(', ')}
    </span>
  );
}
