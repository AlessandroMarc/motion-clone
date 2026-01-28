'use client';

import { formatTimeSlot } from '@/utils/calendarUtils';

interface TimeColumnProps {
  hours: number[];
}

function TimeColumn({ hours }: TimeColumnProps) {
  return (
    <div className="border-r border-border/30">
      {hours.map(hour => (
        <div key={hour} className="h-16 flex items-start justify-end pr-2 pt-0">
          <span className="text-[10px] text-muted-foreground/50 font-medium -mt-1.5">
            {formatTimeSlot(hour)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default TimeColumn;
