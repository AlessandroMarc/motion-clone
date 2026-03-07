import { useMemo, useState } from 'react';
import { toLocalDateString } from '@/utils/dateUtils';

export function useWeekCalendarNavigation() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date()); // mobile single-day view

  // Normalize to a stable date key to avoid unnecessary recalculations
  const currentDateTimestamp = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [currentDate]);

  const currentDateKey = useMemo(() => {
    const date = new Date(currentDateTimestamp);
    return toLocalDateString(new Date(date));
  }, [currentDateTimestamp]);

  const goPreviousWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const goNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const goCurrentWeek = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentDay(today);
  };

  const goPreviousDay = () => {
    const next = new Date(currentDay);
    next.setDate(next.getDate() - 1);
    setCurrentDay(next);
  };

  const goNextDay = () => {
    const next = new Date(currentDay);
    next.setDate(next.getDate() + 1);
    setCurrentDay(next);
  };

  return {
    currentDate,
    currentDay,
    setCurrentDay,
    currentDateKey,
    goPreviousWeek,
    goNextWeek,
    goCurrentWeek,
    goPreviousDay,
    goNextDay,
  };
}
