'use client';

import { CalendarPlus } from 'lucide-react';

interface DayColumnEmptyStateProps {
  date: Date;
  onAddEvent: (date: Date, hour: number, minute: number) => void;
}

export function DayColumnEmptyState({ date, onAddEvent }: DayColumnEmptyStateProps) {
  const isToday = isSameDate(date, new Date());
  const isPast = date < new Date() && !isToday;

  // Position the empty state at around 10am-11am area (comfortable viewing position)
  const topPosition = 10 * 64 + 16; // 10 hours * 64px per hour + some padding

  const handleClick = () => {
    // Default to 9am for adding events
    onAddEvent(date, 9, 0);
  };

  if (isPast) {
    return null; // Don't show empty state for past days
  }

  return (
    <div
      className="absolute left-1 right-1 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      <div className="flex flex-col items-center justify-center text-center py-4 px-2">
        <div className="rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20 p-4 pointer-events-auto hover:bg-muted/50 hover:border-muted-foreground/40 transition-colors cursor-pointer group"
          onClick={handleClick}
        >
          <CalendarPlus className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            {isToday ? 'No events today' : 'No events'}
          </p>
          <p className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/60 mt-1 transition-colors">
            Click to add
          </p>
        </div>
      </div>
    </div>
  );
}

function isSameDate(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default DayColumnEmptyState;
