'use client';

import { useEffect, useMemo, useRef } from 'react';
import { isCalendarEventTask, type CalendarEventUnion } from '@/../../../shared/types';
import { getWeekDates } from '@/utils/calendarUtils';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useAutoSchedule,
  useCalendarDialogs,
  useCalendarEvents,
  useEventDragAndDrop,
  useExternalTaskDrag,
  useExternalTaskDrop,
} from './hooks';
import { useWeekCalendarNavigation } from './useWeekCalendarNavigation';
import { logger } from '@/lib/logger';
import { WeekCalendarView } from './WeekCalendarView';

interface WeekCalendarContainerProps {
  onTaskDropped?: () => void;
}

export function WeekCalendarContainer({ onTaskDropped }: WeekCalendarContainerProps) {
  const { user, activeSchedule } = useAuth();
  const isMobile = useIsMobile();

  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const navigation = useWeekCalendarNavigation();

  const weekDates = useMemo(() => {
    const dateToUse = isMobile
      ? navigation.currentDay
      : new Date(navigation.currentDateKey + 'T00:00:00');
    return getWeekDates(dateToUse);
  }, [navigation.currentDateKey, isMobile, navigation.currentDay]);

  // One-time initial scroll to center around mid-day using an in-grid sentinel
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;

    const run = () => {
      if (window.scrollY > 50) return;
      try {
        sentinel.scrollIntoView({ block: 'center', behavior: 'auto' });
      } catch (e) {
        logger.debug('[WeekCalendar] Error scrolling to sentinel', e);
      }
      hasAutoScrolledRef.current = true;
    };

    let id2: number | null = null;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setTimeout(run, 0);
      });
    });

    return () => {
      if (id1) cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, []);

  const { events, setEvents, eventsByDay, loading, error, refreshEvents } =
    useCalendarEvents(weekDates);

  const dialogs = useCalendarDialogs(user, refreshEvents, onTaskDropped);

  const handleEventUpdate = (eventId: string, startTime: Date, endTime: Date) => {
    setEvents(curr =>
      curr.map(ev => (ev.id === eventId ? { ...ev, start_time: startTime, end_time: endTime } : ev))
    );
  };

  const { draggingEventId, dragPreview, onEventMouseDown } = useEventDragAndDrop(
    weekDates,
    dayRefs,
    event => dialogs.openEditDialog(event),
    handleEventUpdate
  );

  const { handleExternalTaskDrop } = useExternalTaskDrop(
    user,
    weekDates,
    refreshEvents,
    onTaskDropped
  );

  const { externalDragPreview, handleExternalTaskDragOver } = useExternalTaskDrag(
    weekDates,
    dayRefs,
    handleExternalTaskDrop,
    draggingEventId
  );

  const {
    autoScheduleOpen,
    setAutoScheduleOpen,
    tasks,
    tasksMap,
    handleAutoScheduleClick,
    handleAutoSchedule,
  } = useAutoSchedule(user, events, refreshEvents, onTaskDropped);

  const displayDates = isMobile ? [navigation.currentDay] : weekDates;

  const displayEventsByDay = useMemo(() => {
    if (!isMobile) return eventsByDay;

    const dayIndex = weekDates.findIndex(d => d.toDateString() === navigation.currentDay.toDateString());
    if (dayIndex >= 0) {
      return { 'day-0': eventsByDay[`day-${dayIndex}`] || [] };
    }
    return { 'day-0': [] };
  }, [isMobile, eventsByDay, weekDates, navigation.currentDay]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <WeekCalendarView
      isMobile={isMobile}
      weekDates={weekDates}
      displayDates={displayDates}
      displayEventsByDay={displayEventsByDay as Record<string, CalendarEventUnion[]>}
      events={events}
      setEvents={setEvents}
      draggingEventId={draggingEventId}
      dragPreview={dragPreview}
      externalDragPreview={externalDragPreview}
      onEventMouseDown={onEventMouseDown}
      setDayRef={(idx, el) => (dayRefs.current[idx] = el)}
      gridRef={gridRef}
      scrollSentinelRef={scrollSentinelRef}
      sentinelHour={13}
      onExternalTaskDrop={handleExternalTaskDrop}
      onExternalTaskDragOver={handleExternalTaskDragOver}
      tasksMap={tasksMap}
      currentDay={navigation.currentDay}
      onPreviousWeek={navigation.goPreviousWeek}
      onNextWeek={navigation.goNextWeek}
      onCurrentWeek={navigation.goCurrentWeek}
      onPreviousDay={navigation.goPreviousDay}
      onNextDay={navigation.goNextDay}
      dialogs={dialogs as any}
      user={user ? { id: user.id } : null}
      activeSchedule={activeSchedule}
      autoScheduleOpen={autoScheduleOpen}
      setAutoScheduleOpen={setAutoScheduleOpen}
      tasks={tasks}
      handleAutoScheduleClick={handleAutoScheduleClick}
      handleAutoSchedule={handleAutoSchedule}
    />
  );
}


