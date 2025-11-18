import { useState, useEffect, useRef } from 'react';
import { CalendarEventUnion } from '@/../../../shared/types';

const HOUR_PX = 64;

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
  const draggedTaskDataRef = useRef<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // Listen for drag events to capture task data
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const taskId = e.dataTransfer?.getData('application/x-task-id');
      const taskTitle = e.dataTransfer?.getData('application/x-task-title');
      const taskDescription = e.dataTransfer?.getData(
        'application/x-task-description'
      );
      if (taskId && taskTitle) {
        draggedTaskDataRef.current = {
          id: taskId,
          title: taskTitle,
          description: taskDescription || undefined,
        };
        console.log(
          '[useExternalTaskDrag] Captured dragged task data:',
          draggedTaskDataRef.current
        );
      }
    };

    const handleDragEnd = (e: DragEvent) => {
      console.log('[useExternalTaskDrag] handleDragEnd called', {
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

  const handleExternalTaskDragOver = (
    date: Date,
    hour: number,
    minute: number
  ) => {
    console.log('[useExternalTaskDrag] handleExternalTaskDragOver called', {
      date: date.toISOString(),
      hour,
      minute,
      storedTaskData: draggedTaskDataRef.current,
      draggingEventId,
    });
    // Don't override internal drag preview
    if (draggingEventId) {
      console.log(
        '[useExternalTaskDrag] Skipping drag over because internal drag is active'
      );
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
    console.log(
      '[useExternalTaskDrag] Set external drag preview with title:',
      taskTitle
    );
  };

  // Fallback drop handler in case the drop event doesn't hit the specific slots
  useEffect(() => {
    const handleDocumentDrop = (event: DragEvent) => {
      if (event.defaultPrevented) {
        console.log(
          '[useExternalTaskDrag] Document drop ignored because event already handled'
        );
        return;
      }

      const taskData = draggedTaskDataRef.current;
      if (!taskData) {
        console.log(
          '[useExternalTaskDrag] Document drop ignored: no dragged task data'
        );
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
        console.warn('[useExternalTaskDrag] Document drop outside of day columns');
        return;
      }

      const dayRef = dayRefs.current[dayIndex];
      if (!dayRef) {
        console.warn('[useExternalTaskDrag] Document drop: day ref missing');
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

      console.log('[useExternalTaskDrag] Document-level drop fallback triggered', {
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
        console.error('[useExternalTaskDrag] Drop failed:', err);
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

