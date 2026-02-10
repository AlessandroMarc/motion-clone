'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type CalendarEventUnion, isCalendarEventTask } from '@/types';
import { getWeekDates, getDateRange } from '@/utils/calendarUtils';
import { CalendarSkeleton } from './CalendarSkeleton';
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
import { WeekCalendarView } from './WeekCalendarView';
import { MobileDayScrollView } from './MobileDayScrollView';
import { DeadlineViolationsBar } from './DeadlineViolationsBar';
import CalendarCreateDialog from './CalendarCreateDialog';
import CalendarEditDialog from './CalendarEditDialog';
import { HOUR_PX } from './dayColumnLayout';
import { logger } from '@/lib/logger';
import { googleCalendarService } from '@/services/googleCalendarService';

interface WeekCalendarContainerProps {
  onTaskDropped?: () => void;
  onZenMode?: () => void;
}

export function WeekCalendarContainer({
  onTaskDropped,
  onZenMode,
}: WeekCalendarContainerProps) {
  const { user, activeSchedule } = useAuth();
  const isMobile = useIsMobile();

  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const navigation = useWeekCalendarNavigation();

  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  // Initial Google Calendar sync on land
  useEffect(() => {
    if (!user?.id) return;

    const performInitialSync = async () => {
      try {
        logger.info(
          '[WeekCalendarContainer] Checking Google Calendar connection...'
        );
        const status = await googleCalendarService.getStatus(user.id);

        if (status.connected) {
          logger.info('[WeekCalendarContainer] Syncing Google Calendar...');
          await googleCalendarService.sync(user.id);
          logger.info('[WeekCalendarContainer] Google Calendar sync complete');
          // Refresh events to show newly synced ones
          await refreshEvents();
        }
      } catch (err) {
        // Silent fail - don't block the UI if Google sync fails
        logger.warn(
          '[WeekCalendarContainer] Initial Google Calendar sync failed:',
          err
        );
      } finally {
        setInitialSyncComplete(true);
      }
    };

    performInitialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Run once when user ID is available

  const weekDates = useMemo(() => {
    if (isMobile) {
      return getDateRange(navigation.currentDay, 14);
    }
    const dateToUse = new Date(navigation.currentDateKey + 'T00:00:00');
    return getWeekDates(dateToUse);
  }, [navigation.currentDateKey, isMobile, navigation.currentDay]);

  const { events, setEvents, eventsByDay, loading, error, refreshEvents } =
    useCalendarEvents(weekDates);

  const dialogs = useCalendarDialogs(user, refreshEvents, onTaskDropped);

  const handleEventUpdate = (
    eventId: string,
    startTime: Date,
    endTime: Date
  ) => {
    setEvents(curr =>
      curr.map(ev =>
        ev.id === eventId
          ? { ...ev, start_time: startTime, end_time: endTime }
          : ev
      )
    );
  };

  const { draggingEventId, dragPreview, onEventMouseDown } =
    useEventDragAndDrop(
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

  const { externalDragPreview, handleExternalTaskDragOver } =
    useExternalTaskDrag(
      weekDates,
      dayRefs,
      handleExternalTaskDrop,
      draggingEventId
    );

  const { tasksMap, handleAutoScheduleClick } = useAutoSchedule(
    user,
    events,
    refreshEvents,
    onTaskDropped,
    activeSchedule,
    initialSyncComplete
  );

  const displayDates = isMobile ? [navigation.currentDay] : weekDates;

  const displayEventsByDay = useMemo(() => {
    if (!isMobile) return eventsByDay;

    const dayIndex = weekDates.findIndex(
      d => d.toDateString() === navigation.currentDay.toDateString()
    );
    if (dayIndex >= 0) {
      return { 'day-0': eventsByDay[`day-${dayIndex}`] || [] };
    }
    return { 'day-0': [] };
  }, [isMobile, eventsByDay, weekDates, navigation.currentDay]);

  // Calculate sentinel hour based on active schedule's working hours start
  // Default to 9am if no schedule is set
  const sentinelHour = useMemo(() => {
    return activeSchedule?.working_hours_start ?? 9;
  }, [activeSchedule]);

  // Reset scroll flag when sentinel hour changes
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [sentinelHour]);

  // One-time initial scroll to center around working hours start using an in-grid sentinel
  useEffect(() => {
    if (hasAutoScrolledRef.current) {
      return;
    }

    const scrollContainer = gridRef.current;
    const sentinel = scrollSentinelRef.current;

    if (!scrollContainer || !sentinel) {
      return;
    }

    const run = () => {
      const currentScrollTop = scrollContainer.scrollTop;
      if (currentScrollTop > 50) {
        return;
      }

      try {
        const containerHeight = scrollContainer.clientHeight;
        // Calculate scroll position directly: sentinel is at sentinelHour * HOUR_PX from top of scrollable content
        // Center it in viewport: scrollTarget = sentinelPosition - (viewportHeight / 2)
        const sentinelPosition = sentinelHour * HOUR_PX;
        const scrollTarget = sentinelPosition - containerHeight / 2;

        scrollContainer.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'auto',
        });

        hasAutoScrolledRef.current = true;
      } catch (e) {
        logger.warn('Scroll to sentinel failed', e);
      }
    };

    let id2: number | null = null;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setTimeout(run, 100);
      });
    });

    return () => {
      if (id1) cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [sentinelHour]);

  if (loading) return <CalendarSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refreshEvents} />;

  // Mobile: zen-style vertical scroll of consecutive days (not only today)
  if (isMobile) {
    return (
      <div className="space-y-4 flex flex-col min-h-0 flex-1">
        <DeadlineViolationsBar events={events} tasksMap={tasksMap} />
        <MobileDayScrollView
          dates={weekDates}
          eventsByDay={eventsByDay as Record<string, CalendarEventUnion[]>}
          onEventClick={dialogs.openEditDialog}
          tasksMap={tasksMap}
          onToday={navigation.goCurrentWeek}
          onAutoSchedule={handleAutoScheduleClick}
          onZenMode={onZenMode}
        />
        <CalendarCreateDialog
          open={dialogs.createOpen}
          onOpenChange={dialogs.setCreateOpen}
          title={dialogs.title}
          setTitle={dialogs.setTitle}
          description={dialogs.description}
          setDescription={dialogs.setDescription}
          startTime={dialogs.startTime}
          setStartTime={dialogs.setStartTime}
          endTime={dialogs.endTime}
          setEndTime={dialogs.setEndTime}
          onCreate={dialogs.handleCreate}
        />
        <CalendarEditDialog
          open={dialogs.editOpen}
          onOpenChange={dialogs.setEditOpen}
          title={dialogs.editTitle}
          setTitle={dialogs.setEditTitle}
          description={dialogs.editDescription}
          setDescription={dialogs.setEditDescription}
          startTime={dialogs.editStartTime}
          setStartTime={dialogs.setEditStartTime}
          endTime={dialogs.editEndTime}
          setEndTime={dialogs.setEditEndTime}
          isTaskEvent={
            dialogs.editEvent ? isCalendarEventTask(dialogs.editEvent) : false
          }
          completed={dialogs.editCompleted}
          completedAt={
            dialogs.editEvent &&
            isCalendarEventTask(dialogs.editEvent) &&
            dialogs.editEvent.completed_at
              ? new Date(dialogs.editEvent.completed_at)
              : null
          }
          onCompletedChange={dialogs.setEditCompleted}
          onSave={() => dialogs.handleSaveEdit(setEvents)}
          onDelete={() => dialogs.handleDeleteEdit(setEvents)}
        />
      </div>
    );
  }

  return (
    <WeekCalendarView
      isMobile={isMobile}
      weekDates={weekDates}
      displayDates={displayDates}
      displayEventsByDay={
        displayEventsByDay as Record<string, CalendarEventUnion[]>
      }
      events={events}
      setEvents={setEvents}
      draggingEventId={draggingEventId}
      dragPreview={dragPreview}
      externalDragPreview={externalDragPreview}
      onEventMouseDown={onEventMouseDown}
      setDayRef={(idx, el) => (dayRefs.current[idx] = el)}
      gridRef={gridRef}
      scrollSentinelRef={scrollSentinelRef}
      sentinelHour={sentinelHour}
      onExternalTaskDrop={handleExternalTaskDrop}
      onExternalTaskDragOver={handleExternalTaskDragOver}
      tasksMap={tasksMap}
      currentDay={navigation.currentDay}
      onPreviousWeek={navigation.goPreviousWeek}
      onNextWeek={navigation.goNextWeek}
      onCurrentWeek={navigation.goCurrentWeek}
      onPreviousDay={navigation.goPreviousDay}
      onNextDay={navigation.goNextDay}
      onZenMode={onZenMode}
      dialogs={dialogs}
      handleAutoScheduleClick={handleAutoScheduleClick}
    />
  );
}
