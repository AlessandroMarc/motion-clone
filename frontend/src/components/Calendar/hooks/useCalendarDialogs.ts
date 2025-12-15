import { useState } from 'react';
import {
  CalendarEventUnion,
  isCalendarEventTask,
} from '@/../../../shared/types';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';

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

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const openCreateDialog = (date: Date, hour: number, minute: number) => {
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
    setEditStartTime(toLocalInputValue(new Date(event.start_time)));
    setEditEndTime(toLocalInputValue(new Date(event.end_time)));
    setEditCompleted(
      isCalendarEventTask(event) && event.completed_at ? true : false
    );
    setEditEvent(event);
    setEditOpen(true);
  };

  const handleSaveEdit = async (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => {
    if (!editEventId) return;
    try {
      const updateData: any = {
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
        console.log('[useCalendarDialogs] Updating task event completion:', {
          eventId: editEventId,
          completed: editCompleted,
          completed_at: updateData.completed_at,
        });
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
      toast.error('Impossibile salvare le modifiche');
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
  };
}
