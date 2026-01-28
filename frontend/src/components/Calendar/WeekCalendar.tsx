'use client';

import { WeekCalendarContainer } from './WeekCalendarContainer';

interface WeekCalendarProps {
  onTaskDropped?: () => void;
  onZenMode?: () => void;
}

export function WeekCalendar({ onTaskDropped, onZenMode }: WeekCalendarProps) {
  return (
    <WeekCalendarContainer
      onTaskDropped={onTaskDropped}
      onZenMode={onZenMode}
    />
  );
}
