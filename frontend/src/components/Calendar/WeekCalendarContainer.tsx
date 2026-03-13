'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type CalendarEventUnion,
  isCalendarEventTask,
  type Schedule,
} from '@/types';
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
import { calendarService } from '@/services/calendarService';
import { useWeekCalendarNavigation } from './useWeekCalendarNavigation';
import { WeekCalendarView } from './WeekCalendarView';
import { MobileDayScrollView } from './MobileDayScrollView';
import { DeadlineViolationsBar } from './DeadlineViolationsBar';
import CalendarEditDialog from './CalendarEditDialog';
import { CalendarCompletionDialog } from './CalendarCompletionDialog';
import { TaskEditDialogForm } from '@/components/Tasks/forms/TaskEditDialogForm';
import type { Task } from '@/types';
import { HOUR_PX } from './dayColumnLayout';
import { logger } from '@/lib/logger';
import {
  googleCalendarService,
  type FilteredGoogleEvent,
} from '@/services/googleCalendarService';
import { toast } from 'sonner';
import { userSettingsService } from '@/services/userSettingsService';
import { HiddenEventsIndicator } from './HiddenEventsIndicator';

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
  const [hiddenEvents, setHiddenEvents] = useState<FilteredGoogleEvent[]>(
    () => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem('nexto_hidden_gcal_events');
        const events = stored
          ? (JSON.parse(stored) as FilteredGoogleEvent[])
          : [];
        const futureEvents = events.filter(
          ev =>
            ev.start_time &&
            ev.title &&
            ev.start_time > new Date().toISOString()
        );
        return futureEvents;
      } catch {
        return [];
      }
    }
  );

  const { visibleHiddenEvents, bannerEvents } = useMemo(() => {
    return {
      visibleHiddenEvents: hiddenEvents.filter(
        ev => !ev.isAllDay && ev.reason !== 'free'
      ),
      bannerEvents: hiddenEvents.filter(
        ev => ev.isAllDay || ev.reason === 'free'
      ),
    };
  }, [hiddenEvents]);

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
          const result = await googleCalendarService.sync(user.id);

          // handle expired authorization (invalid_grant) from backend
          if (
            Array.isArray(result.errors) &&
            result.errors[0] === 'google_calendar_invalid_grant'
          ) {
            // show toast guiding user to profile page
            toast.error(
              <span>
                Google Calendar authorization expired.{' '}
                <a href="/profile" className="underline">
                  Reconnect in your profile
                </a>
                .
              </span>
            );
          } else {
            logger.info(
              '[WeekCalendarContainer] Google Calendar sync complete'
            );

            // Persist filtered (free/declined) events for the indicator
            const filtered = result.filtered?.events ?? [];
            setHiddenEvents(filtered);
            try {
              localStorage.setItem(
                'nexto_hidden_gcal_events',
                JSON.stringify(filtered)
              );
            } catch {
              // localStorage might be unavailable in some contexts
            }

            // Refresh events to show newly synced ones and refresh global events
            await Promise.all([refreshEvents(), refreshAllEvents()]);
          }
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

  // Fetch all calendar events (used by DeadlineViolationsBar to show violations across weeks)
  const [allEvents, setAllEvents] = useState<CalendarEventUnion[]>([]);

  const refreshAllEvents = async () => {
    try {
      const ev = await calendarService.getAllCalendarEvents();
      setAllEvents(ev);
      return ev;
    } catch (err) {
      console.warn(
        '[WeekCalendarContainer] Failed to load all calendar events',
        err
      );
      setAllEvents([]);
      return [] as CalendarEventUnion[];
    }
  };

  // Ensure we load global events once when user is available
  useEffect(() => {
    if (!user?.id) return;
    // refreshAllEvents is safe to call; failures are non-critical
    refreshAllEvents().catch(() => {});
  }, [user?.id]);

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

  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const loadSchedules = async () => {
      try {
        const allSchedules = await userSettingsService.getUserSchedules(
          user.id
        );
        setSchedules(allSchedules);
      } catch (error) {
        logger.error('Failed to fetch schedules:', error);
      }
    };
    loadSchedules();
  }, [user?.id]);

  const { tasksMap, handleAutoScheduleClick, isRefreshing } = useAutoSchedule(
    user,
    events,
    refreshEvents,
    onTaskDropped,
    activeSchedule,
    initialSyncComplete,
    schedules
  );

  const displayDates = isMobile ? [navigation.currentDay] : weekDates;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskEditOpen, setTaskEditOpen] = useState(false);

  const openTaskEditForm = () => {
    if (!dialogs.editEvent) return;

    // Check if this is a task event
    if (isCalendarEventTask(dialogs.editEvent)) {
      const taskId = (dialogs.editEvent as { linked_task_id?: string | null })
        .linked_task_id;
      if (taskId) {
        const task = tasksMap.get(taskId);
        if (task) {
          setSelectedTask(task);
          setTaskEditOpen(true);
          dialogs.setEditOpen(false); // Close the calendar event dialog
        }
      }
    }
  };

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
  if (error) {
    if (error.startsWith('429:')) {
      return (
        <div className="flex items-start gap-3 m-4 p-4 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
          <span className="text-xl leading-none mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-sm">Rate limit reached (429)</p>
            <p className="text-sm mt-1">{error.replace(/^429:\s*/, '')}</p>
          </div>
        </div>
      );
    }
    return <ErrorState message={error} onRetry={refreshEvents} />;
  }

  // Mobile: zen-style vertical scroll of consecutive days (not only today)
  if (isMobile) {
    return (
      <div className="space-y-4 flex flex-col min-h-0 flex-1">
        <HiddenEventsIndicator events={visibleHiddenEvents} />
        <DeadlineViolationsBar events={allEvents} tasksMap={tasksMap} />
        <MobileDayScrollView
          dates={weekDates}
          eventsByDay={eventsByDay as Record<string, CalendarEventUnion[]>}
          allDayEvents={bannerEvents}
          onEventClick={dialogs.openEditDialog}
          onBannerEventClick={dialogs.openBannerEventDialog}
          tasksMap={tasksMap}
          onToday={navigation.goCurrentWeek}
          onAutoSchedule={handleAutoScheduleClick}
          isAutoScheduleRefreshing={isRefreshing || !initialSyncComplete}
          onZenMode={onZenMode}
        />

        <CalendarEditDialog
          open={dialogs.editOpen}
          onOpenChange={dialogs.setEditOpen}
          title={dialogs.editTitle}
          description={dialogs.editDescription}
          startTime={dialogs.editStartTime}
          endTime={dialogs.editEndTime}
          isTaskEvent={
            dialogs.editEvent ? isCalendarEventTask(dialogs.editEvent) : false
          }
          completed={dialogs.editCompleted}
          onCompletedChange={completed =>
            dialogs.handleUpdateCompletion(completed, setEvents)
          }
          onLinkClick={openTaskEditForm}
        />
        <CalendarCompletionDialog
          open={dialogs.completionChoiceOpen}
          sessionCount={dialogs.completionChoiceSessionCount}
          onChoice={choice => dialogs.handleCompletionChoice(choice, setEvents)}
          onCancel={() => dialogs.setCompletionChoiceOpen(false)}
        />
        <TaskEditDialogForm
          task={selectedTask}
          open={taskEditOpen}
          onOpenChange={setTaskEditOpen}
          onTaskUpdated={_updatedTask => {
            onTaskDropped?.();
            refreshEvents();
          }}
          onTaskCloned={() => {
            onTaskDropped?.();
          }}
        />
      </div>
    );
  }

  return (
    <>
      <HiddenEventsIndicator events={visibleHiddenEvents} />
      <WeekCalendarView
        isMobile={isMobile}
        weekDates={weekDates}
        displayDates={displayDates}
        displayEventsByDay={
          displayEventsByDay as Record<string, CalendarEventUnion[]>
        }
        events={events}
        allDayEvents={bannerEvents}
        // Full event set for DeadlineViolationsBar to detect violations across weeks
        violationEvents={allEvents}
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
        onBannerEventClick={dialogs.openBannerEventDialog}
        openTaskEditForm={openTaskEditForm}
        handleAutoScheduleClick={handleAutoScheduleClick}
        isAutoScheduleRefreshing={isRefreshing || !initialSyncComplete}
        workingHoursStart={activeSchedule?.working_hours_start}
        workingHoursEnd={activeSchedule?.working_hours_end}
      />
      <CalendarCompletionDialog
        open={dialogs.completionChoiceOpen}
        sessionCount={dialogs.completionChoiceSessionCount}
        onChoice={choice => dialogs.handleCompletionChoice(choice, setEvents)}
        onCancel={() => dialogs.setCompletionChoiceOpen(false)}
      />
      <TaskEditDialogForm
        task={selectedTask}
        open={taskEditOpen}
        onOpenChange={setTaskEditOpen}
        onTaskUpdated={_updatedTask => {
          onTaskDropped?.();
          refreshEvents();
        }}
        onTaskCloned={() => {
          onTaskDropped?.();
        }}
      />
    </>
  );
}
