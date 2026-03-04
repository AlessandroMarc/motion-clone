import React from 'react';
import { Clock } from 'lucide-react';
import type { Task } from '@/types';

interface ScheduleBadgeProps {
  task: Task;
}

export function ScheduleBadge({
  task,
}: ScheduleBadgeProps): React.ReactElement | null {
  if (task.is_recurring) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium shrink-0 bg-white/80 text-gray-700 flex items-center gap-1 border border-gray-200">
        <Clock className="h-3 w-3" />
        Recurring
      </span>
    );
  }
  if (task.schedule_id) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium shrink-0 bg-white/80 text-gray-700 flex items-center gap-1 border border-gray-200">
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
    );
  }
  return null;
}
