import React from 'react';
import { cn } from '@/lib/utils';

interface PriorityDotProps {
  priority?: string | null;
  className?: string;
}

export function PriorityDot({
  priority,
  className,
}: PriorityDotProps): React.ReactElement | null {
  if (!priority) return null;
  const priorityColors: Record<string, string> = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full shrink-0',
        priorityColors[priority],
        className
      )}
    />
  );
}
