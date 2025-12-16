'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  isCalendarEventTask,
  type CalendarEventTask,
} from '@/../../../shared/types';
import { getWeekDates } from '@/utils/calendarUtils';
import { CalendarHeader } from './CalendarHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import CalendarCreateDialog from './CalendarCreateDialog';
import CalendarEditDialog from './CalendarEditDialog';
import WeekScrollableGrid from './WeekScrollableGrid';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useCalendarEvents,
  useEventDragAndDrop,
  useExternalTaskDrag,
  useExternalTaskDrop,
  useCalendarDialogs,
  useAutoSchedule,
} from './hooks';

interface WeekCalendarProps {
  onTaskDropped?: () => void;
}

export function WeekCalendar({ onTaskDropped }: WeekCalendarProps) {
  const { user, activeSchedule } = useAuth();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date()); // For mobile single-day view
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  // Normalize currentDate to a stable value (date string) to prevent unnecessary recalculations
  // Use the timestamp normalized to midnight to create a stable key
  const currentDateTimestamp = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [currentDate]);

  const currentDateKey = useMemo(() => {
    const date = new Date(currentDateTimestamp);
    return new Date(date).toISOString().split('T')[0];
  }, [currentDateTimestamp]);

  const weekDates = useMemo(() => {
    // On mobile, use currentDay to determine the week; on desktop, use currentDate
    const dateToUse = isMobile ? currentDay : new Date(currentDateKey + 'T00:00:00');
    return getWeekDates(dateToUse);
  }, [currentDateKey, isMobile, currentDay]);

  // One-time initial scroll to center around mid-day using an in-grid sentinel
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;

    const run = () => {
      // If user already scrolled, do nothing
      if (window.scrollY > 50) return;
      try {
        sentinel.scrollIntoView({ block: 'center', behavior: 'auto' });
      } catch {
        console.error('[WeekCalendar] Error scrolling to sentinel');
      }
      hasAutoScrolledRef.current = true;
    };

    // Defer to next frames to allow CSS/layout/fonts to settle
    let id2: number | null = null;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setTimeout(run, 0);
      });
    });

    return () => {
      if (id1) {
        cancelAnimationFrame(id1);
      }
      if (id2) {
        cancelAnimationFrame(id2);
      }
    };
  }, []);

  // Calendar events management
  const { events, setEvents, eventsByDay, loading, error, refreshEvents } =
    useCalendarEvents(weekDates);

  // Dialogs management (needed before event drag and drop)
  const dialogs = useCalendarDialogs(user, refreshEvents, onTaskDropped);

  // Event drag and drop
  const handleEventUpdate = (
    eventId: string,
    startTime: Date,
    endTime: Date
  ) => {
    setEvents(curr =>
      curr.map(ev =>
        ev.id === eventId
          ? {
              ...ev,
              start_time: startTime,
              end_time: endTime,
            }
          : ev
      )
    );
  };

  const { draggingEventId, dragPreview, onEventMouseDown } =
    useEventDragAndDrop(
      weekDates,
      dayRefs,
      event => {
        dialogs.openEditDialog(event);
      },
      handleEventUpdate
    );

  // External task drag and drop
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

  // Auto-schedule
  const {
    autoScheduleOpen,
    setAutoScheduleOpen,
    tasks,
    tasksMap,
    handleAutoScheduleClick,
    handleAutoSchedule,
  } = useAutoSchedule(user, events, refreshEvents, onTaskDropped);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentDay(today);
  };

  // Mobile day navigation
  const handlePreviousDay = () => {
    const newDay = new Date(currentDay);
    newDay.setDate(newDay.getDate() - 1);
    setCurrentDay(newDay);
  };

  const handleNextDay = () => {
    const newDay = new Date(currentDay);
    newDay.setDate(newDay.getDate() + 1);
    setCurrentDay(newDay);
  };

  // For mobile, use single day; for desktop, use week
  const displayDates = isMobile ? [currentDay] : weekDates;
  
  // For mobile single-day view, map eventsByDay to show only the current day as day-0
  const displayEventsByDay = useMemo(() => {
    if (!isMobile) return eventsByDay;
    
    // Find which day index in the week the currentDay corresponds to
    const dayIndex = weekDates.findIndex(d => 
      d.toDateString() === currentDay.toDateString()
    );
    
    // If found, map that day's events to day-0 for mobile display
    // If not found (day is outside current week), fetch events for that day
    if (dayIndex >= 0) {
      return {
        'day-0': eventsByDay[`day-${dayIndex}`] || []
      };
    }
    
    // Day is outside current week, return empty (events will be fetched when week changes)
    return { 'day-0': [] };
  }, [isMobile, eventsByDay, weekDates, currentDay]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        weekDates={weekDates}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
        onAutoSchedule={handleAutoScheduleClick}
        currentDay={isMobile ? currentDay : undefined}
        onPreviousDay={isMobile ? handlePreviousDay : undefined}
        onNextDay={isMobile ? handleNextDay : undefined}
      />
      <WeekScrollableGrid
        weekDates={displayDates}
        eventsByDay={displayEventsByDay}
        onGridCellClick={dialogs.openCreateDialog}
        onEventMouseDown={onEventMouseDown}
        draggingEventId={draggingEventId}
        dragPreview={draggingEventId ? dragPreview : externalDragPreview}
        setDayRef={(idx, el) => (dayRefs.current[idx] = el)}
        gridRef={gridRef}
        scrollSentinelRef={scrollSentinelRef}
        sentinelHour={13}
        onExternalTaskDrop={handleExternalTaskDrop}
        onExternalTaskDragOver={handleExternalTaskDragOver}
        tasksMap={tasksMap}
        isMobile={isMobile}
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
      {user && (
        <AutoScheduleDialog
          open={autoScheduleOpen}
          onOpenChange={setAutoScheduleOpen}
          tasks={tasks}
          existingEvents={
            events.filter(isCalendarEventTask) as CalendarEventTask[]
          }
          allCalendarEvents={events}
          userId={user.id}
          activeSchedule={activeSchedule}
          onSchedule={handleAutoSchedule}
        />
      )}
    </div>
  );
}
