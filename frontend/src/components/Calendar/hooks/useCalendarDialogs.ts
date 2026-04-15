import { useState } from 'react';
import {
  CalendarEventUnion,
  isCalendarEventTask,
  isCalendarEventDayBlock,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from '@/types';
import { calendarService } from '@/services/calendarService';
import { taskService } from '@/services/taskService';
import { formatDateTimeLocal } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { fireConfetti } from '@/utils/confetti';
import type { FilteredGoogleEvent } from '@/services/googleCalendarService';
import { googleCalendarService } from '@/services/googleCalendarService';

export interface ClickedSlot {
  date: Date;
  hour: number;
  minute: number;
}

/**
 * Custom hook for managing calendar dialog state and event operations.
 * Handles creation, editing, and deletion of both task and Google Calendar events.
 * Manages choice dialog for time slot clicks, completion confirmations, and UI state.
 */
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
  const [completionChoiceIsRecurring, setCompletionChoiceIsRecurring] =
    useState(false);

  // Choice dialog state (Task vs Google Calendar Event)
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [clickedSlot, setClickedSlot] = useState<ClickedSlot | null>(null);

  // Task create dialog triggered from calendar click
  const [taskCreateFromCalendarOpen, setTaskCreateFromCalendarOpen] =
    useState(false);

  // Google Calendar event form state
  const [googleEventFormOpen, setGoogleEventFormOpen] = useState(false);
  const [googleEventFormMode, setGoogleEventFormMode] = useState<
    'create' | 'edit'
  >('create');
  const [googleEventFormData, setGoogleEventFormData] = useState<{
    title?: string;
    description?: string;
    startTime: string;
    endTime: string;
    googleEventId?: string;
  } | null>(null);

  const handleGridCellClick = (date: Date, hour: number, minute: number) => {
    setClickedSlot({ date, hour, minute });
    setChoiceDialogOpen(true);
  };

  const getSlotLabel = (): string | undefined => {
    if (!clickedSlot) return undefined;
    const d = new Date(clickedSlot.date);
    d.setHours(clickedSlot.hour, clickedSlot.minute, 0, 0);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleChooseTask = () => {
    setChoiceDialogOpen(false);
    setTaskCreateFromCalendarOpen(true);
  };

  const handleChooseGoogleEvent = () => {
    if (!clickedSlot) return;
    setChoiceDialogOpen(false);

    const start = new Date(clickedSlot.date);
    start.setHours(clickedSlot.hour, clickedSlot.minute, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    setGoogleEventFormData({
      startTime: formatDateTimeLocal(start),
      endTime: formatDateTimeLocal(end),
    });
    setGoogleEventFormMode('create');
    setGoogleEventFormOpen(true);
  };

  const handleGoogleEventSaved = async () => {
    await refreshEvents();
    onTaskDropped?.();
  };

  const handleEditGoogleEvent = () => {
    if (!editEvent) return;
    const ev = editEvent as CalendarEventUnion & {
      google_event_id?: string | null;
    };
    setEditOpen(false);
    setGoogleEventFormData({
      title: editTitle,
      description: editDescription,
      startTime: editStartTime,
      endTime: editEndTime,
      googleEventId: ev.google_event_id || undefined,
    });
    setGoogleEventFormMode('edit');
    setGoogleEventFormOpen(true);
  };

  const handleDeleteGoogleEvent = async (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEvent) return;
    const ev = editEvent as CalendarEventUnion & {
      google_event_id?: string | null;
    };
    if (!ev.google_event_id) return;

    const confirmed = window.confirm(
      'Delete this Google Calendar event? This will also remove it from Google Calendar.'
    );
    if (!confirmed) return;

    try {
      await googleCalendarService.deleteEvent(ev.google_event_id);
      setEvents(curr => curr.filter(e => e.id !== editEvent.id));
      setEditOpen(false);
      toast.success('Google Calendar event deleted');
      onTaskDropped?.();
    } catch (err) {
      console.error('Failed to delete Google Calendar event:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete event'
      );
    }
  };

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

  const openBannerEventDialog = (event: FilteredGoogleEvent) => {
    setEditEventId(null);
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditStartTime(formatDateTimeLocal(new Date(event.start_time)));
    setEditEndTime(formatDateTimeLocal(new Date(event.end_time)));
    setEditCompleted(false);
    setEditEvent(null);
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
        // Multiple incomplete sessions — check if recurring before asking
        const linkedTask = await taskService.getTaskById(
          editEvent.linked_task_id
        );

        if (linkedTask.is_recurring) {
          // Recurring task: always complete only this occurrence, no dialog needed
          fireConfetti();
          await completeSingleEvent(true, setEvents);
          return;
        }

        // Non-recurring: ask the user (count = this + other incomplete)
        setCompletionChoiceSessionCount(otherIncomplete.length + 1);
        setCompletionChoiceIsRecurring(false);
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

    try {
      if (choice === 'session') {
        // Session-only: no need to fetch the task
        await completeSingleEvent(true, setEvents);
        fireConfetti();
        return;
      }

      const task = await taskService.getTaskById(editEvent.linked_task_id);

      if (task.is_recurring) {
        // Recurring task: 'task' choice behaves like 'session' — complete only this occurrence
        await completeSingleEvent(true, setEvents);
        fireConfetti();
      } else {
        // Non-recurring task: complete task + all linked events
        await taskService.completeTaskWithEvents(task);
        await refreshEvents();
        setEditOpen(false);
        onTaskDropped?.();
        fireConfetti();
        toast.success('Task completed');
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
      toast.error('Failed to complete task');
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
      const isDayBlock = editEvent && isCalendarEventDayBlock(editEvent);

      if (isDayBlock) {
        await calendarService.deleteDayBlock(editEventId);
      } else {
        await calendarService.deleteCalendarEvent(editEventId);
      }
      setEvents(curr => curr.filter(ev => ev.id !== editEventId));
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      throw err;
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
    openBannerEventDialog,
    handleSaveEdit,
    handleDeleteEdit,
    handleUpdateCompletion,
    // Completion choice dialog
    completionChoiceOpen,
    setCompletionChoiceOpen,
    completionChoiceSessionCount,
    completionChoiceIsRecurring,
    handleCompletionChoice,
    // Choice dialog (Task vs Google Event)
    choiceDialogOpen,
    setChoiceDialogOpen,
    clickedSlot,
    handleGridCellClick,
    getSlotLabel,
    handleChooseTask,
    handleChooseGoogleEvent,
    // Task create from calendar
    taskCreateFromCalendarOpen,
    setTaskCreateFromCalendarOpen,
    // Google Calendar event form
    googleEventFormOpen,
    setGoogleEventFormOpen,
    googleEventFormMode,
    googleEventFormData,
    handleGoogleEventSaved,
    handleEditGoogleEvent,
    handleDeleteGoogleEvent,
  };
}
