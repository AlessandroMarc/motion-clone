import { useState } from 'react';
import {
  CalendarEventUnion,
  isCalendarEventTask,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from '@/types';
import { calendarService } from '@/services/calendarService';
import { taskService } from '@/services/taskService';
import { formatDateTimeLocal } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { fireConfetti } from '@/utils/confetti';

export function useCalendarDialogs(
  user: { id: string } | null,
  refreshEvents: () => Promise<CalendarEventUnion[]>,
  onTaskDropped?: () => void
) {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  const [editOpen, setEditOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editCompleted, setEditCompleted] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEventUnion | null>(null);

  // Completion choice dialog state
  const [completionChoiceOpen, setCompletionChoiceOpen] = useState(false);
  const [completionChoiceSessionCount, setCompletionChoiceSessionCount] =
    useState(0);
  const [pendingSetEvents, setPendingSetEvents] = useState<React.Dispatch<
    React.SetStateAction<CalendarEventUnion[]>
  > | null>(null);

  const openCreateDialog = (date: Date, hour: number, minute: number) => {
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    setTitle('');
    setDescription('');
    setStartTime(formatDateTimeLocal(start));
    setEndTime(formatDateTimeLocal(end));
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
      } as CreateCalendarEventInput);

      await refreshEvents();
      setCreateOpen(false);
      toast.success('Calendar event created successfully');
    } catch (err) {
      console.error('Failed to create calendar event:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create calendar event';
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (event: CalendarEventUnion) => {
    setEditEventId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditStartTime(formatDateTimeLocal(new Date(event.start_time)));
    setEditEndTime(formatDateTimeLocal(new Date(event.end_time)));
    setEditCompleted(
      isCalendarEventTask(event) && event.completed_at ? true : false
    );
    setEditEvent(event);
    setEditOpen(true);
  };

  const handleUpdateCompletion = async (
    completed: boolean,
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEventId || !editEvent || !isCalendarEventTask(editEvent)) return;

    // Uncompleting: always just uncomplete this event
    if (!completed) {
      await completeSingleEvent(false, setEvents);
      return;
    }

    // Completing: check if there are other incomplete sessions
    try {
      const allEvents = await calendarService.getCalendarEventsByTaskId(
        editEvent.linked_task_id
      );
      const otherIncomplete = allEvents.filter(
        e => e.id !== editEventId && !e.completed_at
      );

      if (otherIncomplete.length > 0) {
        // Multiple sessions — ask the user
        setCompletionChoiceSessionCount(allEvents.length);
        setPendingSetEvents(() => setEvents);
        setCompletionChoiceOpen(true);
      } else {
        // Only session — just complete it
        fireConfetti();
        await completeSingleEvent(true, setEvents);
      }
    } catch (err) {
      console.error('Failed to check other sessions:', err);
      // Fallback: complete just this event
      fireConfetti();
      await completeSingleEvent(true, setEvents);
    }
  };

  const completeSingleEvent = async (
    completed: boolean,
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEventId) return;
    try {
      const updateData: UpdateCalendarEventInput = {
        completed_at: completed ? new Date().toISOString() : null,
      };

      const updated = await calendarService.updateCalendarEvent(
        editEventId,
        updateData
      );

      setEvents(curr =>
        curr.map(ev => (ev.id === updated.id ? { ...updated } : ev))
      );
      setEditCompleted(completed);
      setEditOpen(false);
      onTaskDropped?.();
    } catch (err) {
      console.error('Failed to update task completion:', err);
      toast.error('Failed to update task');
    }
  };

  const handleCompletionChoice = async (
    choice: 'session' | 'task',
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEvent || !isCalendarEventTask(editEvent)) return;

    setCompletionChoiceOpen(false);
    fireConfetti();

    if (choice === 'session') {
      await completeSingleEvent(true, setEvents);
    } else {
      // Complete entire task + all linked events
      try {
        const task = await taskService.getTaskById(editEvent.linked_task_id);
        await taskService.completeTaskWithEvents(task);
        await refreshEvents();
        setEditOpen(false);
        onTaskDropped?.();
        toast.success('Task completed');
      } catch (err) {
        console.error('Failed to complete entire task:', err);
        toast.error('Failed to complete task');
      }
    }
  };

  const handleSaveEdit = async (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEventId) return;
    try {
      const updateData: UpdateCalendarEventInput = {
        title: editTitle,
        description: editDescription || undefined,
        start_time: new Date(editStartTime).toISOString(),
        end_time: new Date(editEndTime).toISOString(),
      };

      // Always update completed_at for task events
      if (editEvent && isCalendarEventTask(editEvent)) {
        if (editCompleted) {
          // Setting to completed: set completed_at to now
          updateData.completed_at = new Date().toISOString();
        } else {
          // Unchecking: explicitly set to null to remove completion
          updateData.completed_at = null;
        }
      }

      const updated = await calendarService.updateCalendarEvent(
        editEventId,
        updateData
      );

      setEvents(curr =>
        curr.map(ev => (ev.id === updated.id ? { ...updated } : ev))
      );
      setEditOpen(false);

      // Notify parent to refresh task list if completion status changed
      if (
        editEvent &&
        isCalendarEventTask(editEvent) &&
        editCompleted !== !!editEvent.completed_at
      ) {
        onTaskDropped?.();
      }
    } catch (err) {
      console.error('Failed to save calendar event:', err);
      toast.error('Failed to save changes');
    }
  };

  const handleDeleteEdit = async (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEventId) return;
    try {
      await calendarService.deleteCalendarEvent(editEventId);
      setEvents(curr => curr.filter(ev => ev.id !== editEventId));
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
    }
  };

  return {
    // Create dialog
    createOpen,
    setCreateOpen,
    title,
    setTitle,
    description,
    setDescription,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    openCreateDialog,
    handleCreate,
    // Edit dialog
    editOpen,
    setEditOpen,
    editEventId,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editStartTime,
    setEditStartTime,
    editEndTime,
    setEditEndTime,
    editCompleted,
    setEditCompleted,
    editEvent,
    openEditDialog,
    handleSaveEdit,
    handleDeleteEdit,
    handleUpdateCompletion,
    // Completion choice dialog
    completionChoiceOpen,
    setCompletionChoiceOpen,
    completionChoiceSessionCount,
    handleCompletionChoice,
    pendingSetEvents,
  };
}
