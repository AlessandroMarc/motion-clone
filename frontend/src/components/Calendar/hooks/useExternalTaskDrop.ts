import {
  CalendarEventUnion,
  type CreateCalendarEventInput,
} from '@shared/types';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';

export function useExternalTaskDrop(
  user: { id: string } | null,
  weekDates: Date[],
  refreshEvents: () => Promise<CalendarEventUnion[]>,
  onTaskDropped?: () => void
) {
  const handleExternalTaskDrop = async (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => {
    try {
      if (!user) {
        console.error('[useExternalTaskDrop] No user found when dropping task');
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

      await calendarService.createCalendarEvent(
        eventData as CreateCalendarEventInput
      );

      // Refresh calendar events to ensure we have the latest data
      await refreshEvents();

      toast.success('Task scheduled successfully');

      // Notify parent component to refresh task panel
      onTaskDropped?.();
    } catch (err) {
      console.error(
        '[useExternalTaskDrop] Failed to create calendar event from task drop:',
        err
      );
      console.error('[useExternalTaskDrop] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to schedule task';
      toast.error(errorMessage);
    }
  };

  return { handleExternalTaskDrop };
}

