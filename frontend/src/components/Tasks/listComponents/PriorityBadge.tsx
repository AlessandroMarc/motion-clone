import React from 'react';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority?: string | null;
}

function PriorityBadge({
  priority,
}: PriorityBadgeProps): React.ReactElement | null {
  if (!priority) return null;
  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100/50 text-blue-700',
    medium: 'bg-yellow-100/50 text-yellow-700',
    high: 'bg-orange-100/50 text-orange-700',
    critical: 'bg-red-100/50 text-red-700',
  };
  return (
    <span
      className={cn(
        'px-2 py-1 rounded text-xs font-medium shrink-0',
        priorityColors[priority] || 'bg-muted text-muted-foreground'
      )}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
