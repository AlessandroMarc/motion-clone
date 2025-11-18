'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  CalendarEventUnion,
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
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  // Normalize currentDate to a stable value (date string) to prevent unnecessary recalculations
  // Use the timestamp normalized to midnight to create a stable key
  const currentDateKey = useMemo(() => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    const timestamp = date.getTime();
    return new Date(timestamp).toISOString().split('T')[0];
  }, [
    // Use timestamp normalized to midnight as dependency
    (() => {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })(),
  ]);

  const weekDates = useMemo(() => {
    const normalizedDate = new Date(currentDateKey + 'T00:00:00');
    return getWeekDates(normalizedDate);
  }, [currentDateKey]);

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
      } catch {}
      hasAutoScrolledRef.current = true;
    };

    // Defer to next frames to allow CSS/layout/fonts to settle
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        setTimeout(run, 0);
      });
    });

    return () => {
      cancelAnimationFrame(id1);
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

  const {
    externalDragPreview,
    setExternalDragPreview,
    handleExternalTaskDragOver,
  } = useExternalTaskDrag(
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
    setCurrentDate(new Date());
  };

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
      />
      <WeekScrollableGrid
        weekDates={weekDates}
        eventsByDay={eventsByDay}
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
          onSchedule={handleAutoSchedule}
        />
      )}
    </div>
  );
}
