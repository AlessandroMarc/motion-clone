import { useEffect, useRef, useState } from 'react';
import type { CalendarEventTask, CalendarEventUnion } from '@/types';
import { logger } from '@/lib/logger';
import { HOUR_PX } from '../dayColumnLayout';

type DraggedTask = { id: string; title: string; description?: string };

function readTaskFromDataTransfer(
  dt: DataTransfer | null | undefined
): DraggedTask | null {
  const taskId = dt?.getData('application/x-task-id');
  const taskTitle = dt?.getData('application/x-task-title');
  if (!taskId || !taskTitle) return null;

  const taskDescription = dt?.getData('application/x-task-description');
  return {
    id: taskId,
    title: taskTitle,
    description: taskDescription || undefined,
  };
}

export function useExternalTaskDrag(
  weekDates: Date[],
  dayRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
  onTaskDrop: (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => Promise<void>,
  draggingEventId?: string | null
) {
  const [externalDragPreview, setExternalDragPreview] =
    useState<CalendarEventUnion | null>(null);
  const draggedTaskDataRef = useRef<DraggedTask | null>(null);

  // Listen for drag events to capture task data
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const task = readTaskFromDataTransfer(e.dataTransfer);
      if (!task) return;
      draggedTaskDataRef.current = task;
    };

    const handleDragEnd = () => {
      // Don't clear immediately - let the drop handler clear preview if it ran.
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

  const handleExternalTaskDragOver = (
    date: Date,
    hour: number,
    minute: number
  ) => {
    // Don't override internal drag preview
    if (draggingEventId) {
      return;
    }

    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    // Use stored task data from ref
    const taskData = draggedTaskDataRef.current;
    const taskTitle = taskData?.title || 'Task';

    const preview: CalendarEventTask = {
      id: 'external-task-ghost',
      title: taskTitle,
      description: taskData?.description,
      start_time: start,
      end_time: end,
      user_id: 'preview',
      created_at: new Date(),
      updated_at: new Date(),
      linked_task_id: taskData?.id || 'dragging',
      completed_at: null,
    };
    setExternalDragPreview(preview);
  };

  // Fallback drop handler in case the drop event doesn't hit the specific slots
  useEffect(() => {
    const handleDocumentDrop = (event: DragEvent) => {
      if (event.defaultPrevented) return;

      const taskData = draggedTaskDataRef.current;
      if (!taskData) return;

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
        logger.warn(
          '[useExternalTaskDrag] Document drop outside of day columns'
        );
        return;
      }

      const dayRef = dayRefs.current[dayIndex];
      if (!dayRef) {
        logger.warn('[useExternalTaskDrag] Document drop: day ref missing');
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
        event.dataTransfer?.getData('application/x-task-title') ||
        taskData.title;
      const description =
        event.dataTransfer?.getData('application/x-task-description') ||
        taskData.description;

      try {
        event.preventDefault();
        onTaskDrop(
          { id: taskId, title, description },
          dropDate,
          hour,
          minute
        ).finally(() => {
          draggedTaskDataRef.current = null;
          setExternalDragPreview(null);
        });
      } catch (err) {
        logger.error('[useExternalTaskDrag] Drop failed:', err);
        draggedTaskDataRef.current = null;
        setExternalDragPreview(null);
      }
    };

    document.addEventListener('drop', handleDocumentDrop);
    return () => document.removeEventListener('drop', handleDocumentDrop);
  }, [weekDates, dayRefs, onTaskDrop]);

  return {
    externalDragPreview,
    setExternalDragPreview,
    handleExternalTaskDragOver,
  };
}
