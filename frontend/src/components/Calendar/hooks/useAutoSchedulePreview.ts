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
}) {
  const {
    tasks,
    existingEvents,
    allCalendarEvents,
    activeSchedule,
    eventDuration,
  } = params;

  return useMemo(() => {
    return calculateAutoSchedule({
      tasks,
      existingEvents,
      allCalendarEvents,
      activeSchedule,
      eventDuration,
    });
  }, [tasks, existingEvents, allCalendarEvents, activeSchedule, eventDuration]);
}
