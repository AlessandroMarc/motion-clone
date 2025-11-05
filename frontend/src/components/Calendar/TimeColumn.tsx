'use client';

import { formatTimeSlot } from '@/utils/calendarUtils';

interface TimeColumnProps {
  hours: number[];
}

export function TimeColumn({ hours }: TimeColumnProps) {
  return (
    <div className="bg-background">
      {hours.map(hour => (
        <div
          key={hour}
          className="h-16 border-b border-border flex items-start justify-end pr-3 pt-1"
        >
          <span className="text-xs text-muted-foreground">
            {formatTimeSlot(hour)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default TimeColumn;


