import { useState, useEffect, useRef } from 'react';
import {
  CalendarEventUnion,
  type UpdateCalendarEventInput,
} from '@/types';
import { calendarService } from '@/services/calendarService';

const dragThresholdPx = 5;

export function useEventDragAndDrop(
  weekDates: Date[],
  dayRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
  onEventClick: (event: CalendarEventUnion) => void,
  onEventUpdate?: (eventId: string, startTime: Date, endTime: Date) => void
) {
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<CalendarEventUnion | null>(
    null
  );
  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    originalStart: Date;
    originalEnd: Date;
    originalDayIndex: number;
    durationMs: number;
  } | null>(null);
  const pendingClickOrDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    event: CalendarEventUnion;
    eventDayIndex: number;
    active: boolean;
  } | null>(null);

  const onEventMouseDown = (
    e: React.MouseEvent,
    event: CalendarEventUnion,
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
        window.removeEventListener('mouseup', handlePendingMouseUp);
      }
    };

    const handlePendingMouseUp = () => {
      const pending = pendingClickOrDragRef.current;
      if (pending && pending.active) {
        // Treat as click: open edit dialog
        onEventClick(pending.event);
      }
      if (pending) pending.active = false;
      window.removeEventListener('mousemove', handlePendingMouseMove);
      window.removeEventListener('mouseup', handlePendingMouseUp);
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
        } as UpdateCalendarEventInput);

        // Notify parent of update
        if (onEventUpdate) {
          onEventUpdate(
            preview.id,
            new Date(preview.start_time),
            new Date(preview.end_time)
          );
        }
      } catch (err) {
        console.error('Failed to update calendar event:', err);
        throw err;
      } finally {
        setDragPreview(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingEventId, dragPreview, weekDates, dayRefs, onEventUpdate]);

  return {
    draggingEventId,
    dragPreview,
    onEventMouseDown,
  };
}
