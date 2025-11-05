'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarEvent } from '@/../../../shared/types';
import { calendarService } from '@/services/calendarService';
import {
  getWeekDates,
  formatTimeSlot,
  getEventPosition,
  isSameDay,
} from '@/utils/calendarUtils';
import { CalendarHeader, CalendarGridHeader } from './CalendarHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import CalendarCreateDialog from './CalendarCreateDialog';
import CalendarEditDialog from './CalendarEditDialog';
import DayColumn from './DayColumn';
import WeekScrollableGrid from './WeekScrollableGrid';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WeekCalendarProps {
  onTaskDropped?: () => void;
}

export function WeekCalendar({ onTaskDropped }: WeekCalendarProps) {
  const { user } = useAuth();
  const HOUR_PX = 64; // Must match DayColumn
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<CalendarEvent | null>(null);
  const [externalDragPreview, setExternalDragPreview] = useState<CalendarEvent | null>(null);
  const draggedTaskDataRef = useRef<{ id: string; title: string; description?: string } | null>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    originalStart: Date;
    originalEnd: Date;
    originalDayIndex: number;
    durationMs: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const pendingClickOrDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    event: CalendarEvent;
    eventDayIndex: number;
    active: boolean;
  } | null>(null);
  const dragThresholdPx = 5;

  const [editOpen, setEditOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const getWeekRangeIso = () => {
    const startDate = new Date(weekDates[0]);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(weekDates[6]);
    endDate.setHours(23, 59, 59, 999);
    return {
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
    };
  };

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
      // Store nested id in closure; no need to cancel in typical flow
    });

    return () => {
      cancelAnimationFrame(id1);
    };
  }, []);

  // Fetch events for the current week
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('[WeekCalendar] Fetching calendar events for week');
        setLoading(true);
        setError(null);

        const { startIso, endIso } = getWeekRangeIso();

        console.log('[WeekCalendar] Fetching events for date range:', {
          startIso,
          endIso,
          weekDates: weekDates.map(d => d.toISOString().split('T')[0]),
        });

        const weekEvents = await calendarService.getCalendarEventsByDateRange(
          startIso,
          endIso
        );

        console.log('[WeekCalendar] Fetched calendar events:', {
          count: weekEvents.length,
          events: weekEvents.map(e => ({
            id: e.id,
            title: e.title,
            linked_task_id: e.linked_task_id,
            start_time: e.start_time,
            end_time: e.end_time,
          })),
        });

        setEvents(weekEvents);
      } catch (err) {
        console.error('[WeekCalendar] Failed to fetch calendar events:', err);
        console.error('[WeekCalendar] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          error: err,
        });
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar events'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [weekDates]);

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

  // Group events by day for easier rendering
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};

    weekDates.forEach((date, index) => {
      const dayKey = `day-${index}`;
      grouped[dayKey] = events.filter(event =>
        isSameDay(event.start_time, date)
      );
    });

    return grouped;
  }, [events, weekDates]);

  // Generate time slots (0-23 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const onGridCellClick = (date: Date, hour: number, minute: number) => {
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    setTitle('');
    setDescription('');
    setStartTime(toLocalInputValue(start));
    setEndTime(toLocalInputValue(end));
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      if (!user) {
        toast.error('You must be logged in to create calendar events');
        return;
      }

      const eventStartIso = new Date(startTime).toISOString();
      const eventEndIso = new Date(endTime).toISOString();
      await calendarService.createCalendarEvent({
        title,
        start_time: eventStartIso,
        end_time: eventEndIso,
        description: description || undefined,
        user_id: user.id,
      } as any);

      // Refresh current week events
      const { startIso, endIso } = getWeekRangeIso();
      const weekEvents = await calendarService.getCalendarEventsByDateRange(
        startIso,
        endIso
      );
      setEvents(weekEvents);
      setCreateOpen(false);
      toast.success('Calendar event created successfully');
    } catch (err) {
      console.error('Failed to create calendar event:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create calendar event';
      toast.error(errorMessage);
    }
  };

  // Handle external task dropped onto the calendar grid
  const handleExternalTaskDrop = async (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => {
    console.log('[WeekCalendar] handleExternalTaskDrop called', {
      task,
      date: date.toISOString(),
      hour,
      minute,
      user: user?.id,
    });

    try {
      if (!user) {
        console.error('[WeekCalendar] No user found when dropping task');
        toast.error('You must be logged in to schedule tasks');
        return;
      }

      const start = new Date(date);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      const eventData = {
        title: task.title,
        description: task.description,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        linked_task_id: task.id,
        user_id: user.id,
      };

      console.log('[WeekCalendar] Creating calendar event with data:', eventData);

      const created = await calendarService.createCalendarEvent(eventData as any);

      console.log('[WeekCalendar] Calendar event created successfully:', created);

      // Refresh calendar events to ensure we have the latest data
      const { startIso, endIso } = getWeekRangeIso();
      console.log('[WeekCalendar] Refreshing calendar events for date range:', {
        startIso,
        endIso,
      });

      const weekEvents = await calendarService.getCalendarEventsByDateRange(
        startIso,
        endIso
      );

      console.log('[WeekCalendar] Refreshed calendar events:', {
        count: weekEvents.length,
        events: weekEvents.map(e => ({
          id: e.id,
          title: e.title,
          linked_task_id: e.linked_task_id,
          start_time: e.start_time,
        })),
      });

      setEvents(weekEvents);
      
      setExternalDragPreview(null);
      toast.success('Task scheduled successfully');
      
      console.log('[WeekCalendar] Calling onTaskDropped callback');
      // Notify parent component to refresh task panel
      onTaskDropped?.();
    } catch (err) {
      console.error('[WeekCalendar] Failed to create calendar event from task drop:', err);
      console.error('[WeekCalendar] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to schedule task';
      toast.error(errorMessage);
    }
  };

  // Listen for drag events to capture task data
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const taskId = e.dataTransfer?.getData('application/x-task-id');
      const taskTitle = e.dataTransfer?.getData('application/x-task-title');
      const taskDescription = e.dataTransfer?.getData('application/x-task-description');
      if (taskId && taskTitle) {
        draggedTaskDataRef.current = {
          id: taskId,
          title: taskTitle,
          description: taskDescription || undefined,
        };
        console.log('[WeekCalendar] Captured dragged task data:', draggedTaskDataRef.current);
      }
    };

    const handleDragEnd = (e: DragEvent) => {
      console.log('[WeekCalendar] handleDragEnd called', {
        dropEffect: e.dataTransfer?.dropEffect,
        effectAllowed: e.dataTransfer?.effectAllowed,
      });
      // Don't clear immediately - wait a bit to see if drop was successful
      // The drop handler will clear the preview if successful
      setTimeout(() => {
        draggedTaskDataRef.current = null;
        setExternalDragPreview(null);
      }, 100);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  const handleExternalTaskDragOver = (date: Date, hour: number, minute: number) => {
    console.log('[WeekCalendar] handleExternalTaskDragOver called', {
      date: date.toISOString(),
      hour,
      minute,
      draggingEventId,
      storedTaskData: draggedTaskDataRef.current,
    });
    // Don't override internal drag preview
    if (draggingEventId) {
      console.log('[WeekCalendar] Skipping drag over because internal drag is active');
      return;
    }
    
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    
    // Use stored task data from ref
    const taskData = draggedTaskDataRef.current;
    const taskTitle = taskData?.title || 'Task';
    const taskDescription = taskData?.description;
    
    setExternalDragPreview({
      id: 'external-task-ghost',
      title: taskTitle,
      description: taskDescription,
      start_time: start,
      end_time: end,
      created_at: new Date(),
      updated_at: new Date(),
      linked_task_id: taskData?.id || 'dragging',
    } as any);
    console.log('[WeekCalendar] Set external drag preview with title:', taskTitle);
  };

  // Fallback drop handler in case the drop event doesn't hit the specific slots
  useEffect(() => {
    const handleDocumentDrop = (event: DragEvent) => {
      if (event.defaultPrevented) {
        console.log('[WeekCalendar] Document drop ignored because event already handled');
        return;
      }

      const taskData = draggedTaskDataRef.current;
      if (!taskData) {
        console.log('[WeekCalendar] Document drop ignored: no dragged task data');
        return;
      }

      // Determine which day column the drop occurred in
      const dayIndex = dayRefs.current.findIndex(ref => {
        if (!ref) return false;
        const rect = ref.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      });

      if (dayIndex === -1) {
        console.warn('[WeekCalendar] Document drop outside of day columns');
        return;
      }

      const dayRef = dayRefs.current[dayIndex];
      if (!dayRef) {
        console.warn('[WeekCalendar] Document drop: day ref missing');
        return;
      }

      const rect = dayRef.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      const hourFloat = relativeY / HOUR_PX;
      const hour = Math.min(Math.max(Math.floor(hourFloat), 0), 23);
      const minute = hourFloat - hour >= 0.5 ? 30 : 0;

      const dropDate = new Date(weekDates[dayIndex]);

      const taskId =
        event.dataTransfer?.getData('application/x-task-id') || taskData.id;
      const title =
        event.dataTransfer?.getData('application/x-task-title') || taskData.title;
      const description =
        event.dataTransfer?.getData('application/x-task-description') ||
        taskData.description;

      console.log('[WeekCalendar] Document-level drop fallback triggered', {
        taskId,
        title,
        description,
        dayIndex,
        dropDate: dropDate.toISOString(),
        hour,
        minute,
        relativeY,
      });

      try {
        event.preventDefault();
        handleExternalTaskDrop({ id: taskId, title, description }, dropDate, hour, minute);
      } finally {
        draggedTaskDataRef.current = null;
        setExternalDragPreview(null);
      }
    };

    document.addEventListener('drop', handleDocumentDrop);
    return () => document.removeEventListener('drop', handleDocumentDrop);
  }, [weekDates, handleExternalTaskDrop]);

  // Drag & drop handlers
  const onEventMouseDown = (
    e: React.MouseEvent,
    event: CalendarEvent,
    eventDayIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Defer decision: click vs drag based on movement threshold
    pendingClickOrDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      event,
      eventDayIndex,
      active: true,
    };

    const handlePendingMouseMove = (me: MouseEvent) => {
      const pending = pendingClickOrDragRef.current;
      if (!pending || !pending.active) return;
      const dx = me.clientX - pending.startClientX;
      const dy = me.clientY - pending.startClientY;
      if (Math.abs(dx) > dragThresholdPx || Math.abs(dy) > dragThresholdPx) {
        // Initiate drag
        setDraggingEventId(pending.event.id);
        dragStateRef.current = {
          startClientX: me.clientX,
          startClientY: me.clientY,
          originalStart: new Date(pending.event.start_time),
          originalEnd: new Date(pending.event.end_time),
          originalDayIndex: pending.eventDayIndex,
          durationMs:
            new Date(pending.event.end_time).getTime() -
            new Date(pending.event.start_time).getTime(),
        };
        setDragPreview(pending.event);
        pending.active = false;
        window.removeEventListener('mousemove', handlePendingMouseMove);
        window.removeEventListener('mouseup', handlePendingMouseUp as any);
      }
    };

    const handlePendingMouseUp = () => {
      const pending = pendingClickOrDragRef.current;
      if (pending && pending.active) {
        // Treat as click: open edit dialog
        openEditDialog(pending.event);
      }
      if (pending) pending.active = false;
      window.removeEventListener('mousemove', handlePendingMouseMove);
      window.removeEventListener('mouseup', handlePendingMouseUp as any);
    };

    window.addEventListener('mousemove', handlePendingMouseMove);
    window.addEventListener('mouseup', handlePendingMouseUp, { once: true });
  };

  useEffect(() => {
    if (!draggingEventId) return;

    const hourHeight = 64; // px
    const minutesPerPixel = 60 / hourHeight;
    const snapMinutes = 30; // snap to 30 minutes

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      // Determine which day column we're over
      let targetDayIndex = state.originalDayIndex;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const el = dayRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          targetDayIndex = i;
          break;
        }
      }

      // Vertical movement -> minutes delta
      const deltaY = e.clientY - state.startClientY;
      const deltaMinutesRaw = deltaY * minutesPerPixel;
      const deltaMinutes =
        Math.round(deltaMinutesRaw / snapMinutes) * snapMinutes;

      const baseStart = new Date(state.originalStart);
      // Adjust base to same time on target day
      const baseDayDate = new Date(weekDates[targetDayIndex]);
      baseDayDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);

      const newStart = new Date(
        baseDayDate.getTime() + deltaMinutes * 60 * 1000
      );
      const newEnd = new Date(newStart.getTime() + state.durationMs);

      setDragPreview(prev =>
        prev
          ? {
              ...prev,
              start_time: newStart,
              end_time: newEnd,
            }
          : prev
      );
    };

    const handleMouseUp = async () => {
      const state = dragStateRef.current;
      const preview = dragPreview;
      setDraggingEventId(null);
      dragStateRef.current = null;

      if (!state || !preview) {
        setDragPreview(null);
        return;
      }

      // Persist update
      try {
        await calendarService.updateCalendarEvent(preview.id, {
          start_time: (preview.start_time as Date).toISOString(),
          end_time: (preview.end_time as Date).toISOString(),
        } as any);

        // Optimistically update local state
        setEvents(curr =>
          curr.map(ev =>
            ev.id === preview.id
              ? {
                  ...ev,
                  start_time: new Date(preview.start_time),
                  end_time: new Date(preview.end_time),
                }
              : ev
          )
        );
      } catch (err) {
        console.error('Failed to update calendar event:', err);
        // Optionally: revert UI by doing nothing (state remains old)
      } finally {
        setDragPreview(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp as any);
    };
  }, [draggingEventId, dragPreview, weekDates]);

  const openEditDialog = (event: CalendarEvent) => {
    setEditEventId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditStartTime(toLocalInputValue(new Date(event.start_time)));
    setEditEndTime(toLocalInputValue(new Date(event.end_time)));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editEventId) return;
    try {
      const updated = await calendarService.updateCalendarEvent(editEventId, {
        title: editTitle,
        description: editDescription || undefined,
        start_time: new Date(editStartTime).toISOString(),
        end_time: new Date(editEndTime).toISOString(),
      } as any);

      setEvents(curr =>
        curr.map(ev => (ev.id === updated.id ? { ...updated } : ev))
      );
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to save calendar event:', err);
    }
  };

  const handleDeleteEdit = async () => {
    if (!editEventId) return;
    try {
      await calendarService.deleteCalendarEvent(editEventId);
      setEvents(curr => curr.filter(ev => ev.id !== editEventId));
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
    }
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
      />
      <WeekScrollableGrid
        weekDates={weekDates}
        eventsByDay={eventsByDay}
        onGridCellClick={onGridCellClick}
        onEventMouseDown={onEventMouseDown}
        draggingEventId={draggingEventId}
        dragPreview={draggingEventId ? dragPreview : externalDragPreview}
        setDayRef={(idx, el) => (dayRefs.current[idx] = el)}
        gridRef={gridRef}
        scrollSentinelRef={scrollSentinelRef}
        sentinelHour={13}
        // Provide drop handler to each DayColumn through WeekScrollableGrid
        // WeekScrollableGrid passes through to DayColumn
        // @ts-ignore
        onExternalTaskDrop={handleExternalTaskDrop}
        // @ts-ignore
        onExternalTaskDragOver={handleExternalTaskDragOver}
      />
      <CalendarCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        onCreate={handleCreate}
      />
      <CalendarEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editTitle}
        setTitle={setEditTitle}
        description={editDescription}
        setDescription={setEditDescription}
        startTime={editStartTime}
        setStartTime={setEditStartTime}
        endTime={editEndTime}
        setEndTime={setEditEndTime}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
      />
    </div>
  );
}
