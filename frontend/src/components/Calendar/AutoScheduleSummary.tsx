'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function AutoScheduleSummary({
  totalEvents,
  taskCount,
  totalViolations,
}: {
  totalEvents: number;
  taskCount: number;
  totalViolations: number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-blue-600" />
        <span className="font-medium">
          {totalEvents} events will be created for {taskCount} tasks
        </span>
      </div>
      {totalViolations > 0 && (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">
            {totalViolations} events scheduled after deadline
          </span>
        </div>
      )}
    </div>
  );
}


