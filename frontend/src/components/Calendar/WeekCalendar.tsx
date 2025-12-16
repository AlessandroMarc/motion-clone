'use client';

import { WeekCalendarContainer } from './WeekCalendarContainer';

interface WeekCalendarProps {
  onTaskDropped?: () => void;
}

export function WeekCalendar({ onTaskDropped }: WeekCalendarProps) {
  return <WeekCalendarContainer onTaskDropped={onTaskDropped} />;
}
