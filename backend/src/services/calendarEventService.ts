import { supabase } from '../config/supabase.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import type { CalendarEventTask, CalendarEventUnion } from '@shared/types.js';
import { TaskService } from './taskService.js';

const normalizeNullableDate = (
  value: string | Date | null | undefined
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
};

export class CalendarEventService {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  private calculateEventDurationMinutes(
    startTime: string | Date,
    endTime: string | Date
  ): number {
    const start =
      typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60)));
  }

  private async updateTaskDurationFromEvent(
    taskId: string,
    eventDurationMinutes: number,
    isCompleting: boolean
  ): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        console.warn(
          `[CalendarEventService] Task ${taskId} not found, skipping duration update`
        );
        return;
      }

      const currentActual = task.actual_duration_minutes ?? 0;
      const planned = task.planned_duration_minutes ?? 0;

      let newActual: number;
      if (isCompleting) {
        newActual = Math.min(currentActual + eventDurationMinutes, planned);
      } else {
        newActual = Math.max(0, currentActual - eventDurationMinutes);
      }

      await this.taskService.updateTask(taskId, {
        actual_duration_minutes: newActual,
      });

      console.log(
        `[CalendarEventService] Updated task ${taskId} actual duration: ${currentActual} -> ${newActual} (${isCompleting ? '+' : '-'}${eventDurationMinutes}min)`
      );
    } catch (error) {
      console.error(
        `[CalendarEventService] Failed to update task duration:`,
        error
      );
    }
  }

  private async ensureNoOverlaps(
    userId: string,
    startTimeIso: string,
    endTimeIso: string,
    excludeEventId?: string
  ): Promise<void> {
    if (new Date(startTimeIso) >= new Date(endTimeIso)) {
      throw new Error('Calendar event end time must be after start time');
    }

    const query = supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', userId)
      .lt('start_time', endTimeIso)
      .gt('end_time', startTimeIso);

    if (excludeEventId) {
      query.neq('id', excludeEventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CalendarEventService] Failed overlap check:', error);
      throw new Error('Failed to validate calendar event overlap');
    }

    if (data && data.length > 0) {
      throw new Error('Calendar event overlaps with an existing event');
    }
  }

  // Create a new calendar event
  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    console.log(
      '[CalendarEventService] createCalendarEvent called with input:',
      input
    );

    // Skip overlap check for events synced from Google (they may overlap)
    if (!input.synced_from_google) {
      await this.ensureNoOverlaps(
        input.user_id,
        input.start_time,
        input.end_time
      );
    }

    const insertData: {
      title: string;
      start_time: string;
      end_time: string;
      linked_task_id: string | null;
      description: string | null;
      user_id: string;
      completed_at: string | null;
      google_event_id?: string | null;
      synced_from_google?: boolean;
    } = {
      title: input.title,
      start_time: input.start_time,
      end_time: input.end_time,
      linked_task_id: input.linked_task_id ?? null,
      description: input.description ?? null,
      user_id: input.user_id,
      completed_at: input.linked_task_id
        ? normalizeNullableDate(input.completed_at)
        : null,
    };

    if (input.google_event_id !== undefined) {
      insertData.google_event_id = input.google_event_id ?? null;
    }
    if (input.synced_from_google !== undefined) {
      insertData.synced_from_google = input.synced_from_google;
    }

    console.log('[CalendarEventService] Inserting calendar event:', insertData);

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[CalendarEventService] Failed to create calendar event:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    console.log(
      '[CalendarEventService] Calendar event created successfully:',
      data
    );

    if (input.linked_task_id && insertData.completed_at) {
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        input.start_time,
        input.end_time
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          input.linked_task_id,
          eventDurationMinutes,
          true
        );
      }
    }

    return data;
  }

  // Get all calendar events
  async getAllCalendarEvents(): Promise<CalendarEventUnion[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }

    return data || [];
  }

  // Get calendar event by ID
  async getCalendarEventById(id: string): Promise<CalendarEventUnion | null> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Calendar event not found
      }
      throw new Error(`Failed to fetch calendar event: ${error.message}`);
    }

    return data;
  }

  // Update calendar event
  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    console.log('[CalendarEventService] updateCalendarEvent called:', {
      id,
      input,
      completed_at: input.completed_at,
      completed_at_type: typeof input.completed_at,
    });
    const existing = await this.getCalendarEventById(id);
    if (!existing) {
      throw new Error('Calendar event not found');
    }

    const newStart =
      input.start_time ?? (existing.start_time as unknown as string);
    const newEnd = input.end_time ?? (existing.end_time as unknown as string);

    // Skip overlap check for events synced from Google
    const isSyncedFromGoogle =
      (existing as unknown as { synced_from_google?: boolean })
        .synced_from_google ?? false;
    const willBeSyncedFromGoogle = input.synced_from_google ?? false;

    if (!isSyncedFromGoogle && !willBeSyncedFromGoogle) {
      await this.ensureNoOverlaps(existing.user_id, newStart, newEnd, id);
    }

    const updateData: {
      updated_at: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      linked_task_id?: string | null;
      description?: string;
      completed_at?: string | null;
      google_event_id?: string | null;
      synced_from_google?: boolean;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.start_time !== undefined)
      updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.linked_task_id !== undefined)
      updateData.linked_task_id = input.linked_task_id;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.google_event_id !== undefined)
      updateData.google_event_id = input.google_event_id ?? null;
    if (input.synced_from_google !== undefined)
      updateData.synced_from_google = input.synced_from_google;

    const nextLinkedTaskId =
      input.linked_task_id !== undefined
        ? input.linked_task_id
        : ((existing as unknown as { linked_task_id?: string | null })
            .linked_task_id ?? null);

    const existingCompletedAt = normalizeNullableDate(
      (existing as unknown as { completed_at?: string | Date | null })
        .completed_at
    );

    let completedAt: string | null;
    if (!nextLinkedTaskId) {
      // Not a task event: always set to null
      completedAt = null;
    } else if (input.completed_at !== undefined) {
      // Explicitly provided: normalize it (could be null, string, or Date)
      completedAt = normalizeNullableDate(input.completed_at);
      console.log('[CalendarEventService] Setting completed_at:', {
        input_completed_at: input.completed_at,
        normalized: completedAt,
      });
    } else {
      // Not provided: keep existing value
      completedAt = existingCompletedAt;
      console.log(
        '[CalendarEventService] Keeping existing completed_at:',
        completedAt
      );
    }

    updateData.completed_at = completedAt;
    console.log(
      '[CalendarEventService] Final updateData.completed_at:',
      updateData.completed_at
    );

    const wasCompleted = !!existingCompletedAt;
    const willBeCompleted = !!completedAt;
    const isCompleting = !wasCompleted && willBeCompleted;
    const isUncompleting = wasCompleted && !willBeCompleted;

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }

    if (nextLinkedTaskId && (isCompleting || isUncompleting)) {
      const eventStart =
        updateData.start_time ?? (existing.start_time as unknown as string);
      const eventEnd =
        updateData.end_time ?? (existing.end_time as unknown as string);
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        eventStart,
        eventEnd
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          nextLinkedTaskId,
          eventDurationMinutes,
          isCompleting
        );
      }
    }

    return data;
  }

  // Delete calendar event
  async deleteCalendarEvent(id: string): Promise<boolean> {
    const existing = await this.getCalendarEventById(id);

    if (existing?.linked_task_id && existing.completed_at) {
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        existing.start_time,
        existing.end_time
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          existing.linked_task_id,
          eventDurationMinutes,
          false
        );
      }
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }

    return true;
  }

  // Get calendar events by date range
  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventUnion[]> {
    console.log('[CalendarEventService] getCalendarEventsByDateRange called:', {
      startDate,
      endDate,
    });

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[CalendarEventService] Failed to fetch calendar events:', {
        error,
        message: error.message,
        details: error.details,
      });
      throw new Error(
        `Failed to fetch calendar events by date range: ${error.message}`
      );
    }

    console.log('[CalendarEventService] Fetched calendar events:', {
      count: data?.length || 0,
      events: data?.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: e.linked_task_id,
        start_time: e.start_time,
        user_id: e.user_id,
      })),
    });

    return data || [];
  }

  // Get calendar events linked to a task
  async getCalendarEventsByTaskId(
    taskId: string
  ): Promise<CalendarEventTask[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('linked_task_id', taskId)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch calendar events by task: ${error.message}`
      );
    }

    return data || [];
  }

  // Get calendar event by Google event ID
  async getCalendarEventByGoogleEventId(
    userId: string,
    googleEventId: string
  ): Promise<CalendarEventUnion | null> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('google_event_id', googleEventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Event not found
      }
      throw new Error(
        `Failed to fetch calendar event by Google event ID: ${error.message}`
      );
    }

    return data;
  }
}
