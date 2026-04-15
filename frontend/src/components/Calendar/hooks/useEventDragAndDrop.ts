import { useState, useEffect, useRef } from 'react';
import {
  CalendarEventUnion,
  isCalendarEventTask,
  type UpdateCalendarEventInput,
} from '@/types';
import { calendarService } from '@/services/calendarService';
import { taskService } from '@/services/taskService';
import { googleCalendarService } from '@/services/googleCalendarService';

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
    dragType: 'move' | 'resize';
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
          dragType: 'move',
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

  const onResizeMouseDown = (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDraggingEventId(event.id);
    dragStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      originalStart: new Date(event.start_time),
      originalEnd: new Date(event.end_time),
      originalDayIndex: eventDayIndex,
      durationMs:
        new Date(event.end_time).getTime() -
        new Date(event.start_time).getTime(),
      dragType: 'resize',
    };
    setDragPreview(event);
  };

  useEffect(() => {
    if (!draggingEventId) return;

    const hourHeight = 64; // px
    const minutesPerPixel = 60 / hourHeight;
    const snapMinutesMove = 30;
    const snapMinutesResize = 15;
    const minDurationMs = 15 * 60 * 1000;

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      if (state.dragType === 'resize') {
        // Resize: only change end_time, start stays fixed
        const deltaY = e.clientY - state.startClientY;
        const deltaMinutesRaw = deltaY * minutesPerPixel;
        const deltaMinutes =
          Math.round(deltaMinutesRaw / snapMinutesResize) * snapMinutesResize;

        const newEndMs = state.originalEnd.getTime() + deltaMinutes * 60 * 1000;
        // Enforce minimum duration
        const clampedEndMs = Math.max(
          state.originalStart.getTime() + minDurationMs,
          newEndMs
        );
        const newEnd = new Date(clampedEndMs);

        setDragPreview(prev =>
          prev
            ? {
                ...prev,
                end_time: newEnd,
              }
            : prev
        );
      } else {
        // Move: existing logic — day-crossing, 30-min snap, updates both start+end
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

        const deltaY = e.clientY - state.startClientY;
        const deltaMinutesRaw = deltaY * minutesPerPixel;
        const deltaMinutes =
          Math.round(deltaMinutesRaw / snapMinutesMove) * snapMinutesMove;

        const baseStart = new Date(state.originalStart);
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
      }
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
        const newStartTime = (preview.start_time as Date).toISOString();
        const newEndTime = (preview.end_time as Date).toISOString();

        const isGoogleEvent =
          !isCalendarEventTask(preview) &&
          'google_event_id' in preview &&
          preview.google_event_id;

        if (isGoogleEvent) {
          // Update via Google Calendar API (syncs to Google and updates local DB)
          await googleCalendarService.updateEvent(preview.google_event_id!, {
            start_time: newStartTime,
            end_time: newEndTime,
          });
        } else {
          // Task event: update internal calendar event
          const originalStart = (state.originalStart as Date).toISOString();
          const originalEnd = new Date(
            new Date(state.originalStart).getTime() + state.durationMs
          ).toISOString();

          await calendarService.updateCalendarEvent(preview.id, {
            start_time: newStartTime,
            end_time: newEndTime,
          } as UpdateCalendarEventInput);

          // Mark the linked task as manually pinned so auto-schedule won't move it
          if (isCalendarEventTask(preview) && preview.linked_task_id) {
            try {
              await taskService.updateTask(preview.linked_task_id, {
                isManuallyPinned: true,
              });
            } catch (pinErr) {
              // Rollback calendar event to its original times
              await calendarService.updateCalendarEvent(preview.id, {
                start_time: originalStart,
                end_time: originalEnd,
              } as UpdateCalendarEventInput);
              throw pinErr;
            }
          }
        }

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
    onResizeMouseDown,
  };
}
