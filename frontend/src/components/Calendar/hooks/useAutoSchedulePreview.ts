'use client';

import { useMemo } from 'react';
import type { CalendarEventTask, CalendarEventUnion, Task } from '@/types';
import type { Schedule } from '@/types';
import { calculateAutoSchedule } from '@/utils/autoScheduleCalculator';

export function useAutoSchedulePreview(params: {
  tasks: Task[];
  existingEvents: CalendarEventTask[];
  allCalendarEvents: CalendarEventUnion[];
  activeSchedule: Schedule | null;
  eventDuration: number;
  schedules?: Schedule[];
}) {
  const {
    tasks,
    existingEvents,
    allCalendarEvents,
    activeSchedule,
    eventDuration,
    schedules = [],
  } = params;

  return useMemo(() => {
    return calculateAutoSchedule({
      tasks,
      existingEvents,
      allCalendarEvents,
      activeSchedule,
      eventDuration,
      schedules,
    });
  }, [tasks, existingEvents, allCalendarEvents, activeSchedule, eventDuration, schedules]);
}
