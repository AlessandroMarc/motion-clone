import { supabase } from '../config/supabase.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import type { CalendarEvent } from '@shared/types.js';

export class CalendarEventService {
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
  ): Promise<CalendarEvent> {
    console.log('[CalendarEventService] createCalendarEvent called with input:', input);
    
    await this.ensureNoOverlaps(
      input.user_id,
      input.start_time,
      input.end_time
    );

    const insertData = {
      title: input.title,
      start_time: input.start_time,
      end_time: input.end_time,
      linked_task_id: input.linked_task_id,
      description: input.description,
      user_id: input.user_id,
    };
    
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

    console.log('[CalendarEventService] Calendar event created successfully:', data);
    return data;
  }

  // Get all calendar events
  async getAllCalendarEvents(): Promise<CalendarEvent[]> {
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
  async getCalendarEventById(id: string): Promise<CalendarEvent | null> {
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
  ): Promise<CalendarEvent> {
    const existing = await this.getCalendarEventById(id);
    if (!existing) {
      throw new Error('Calendar event not found');
    }

    const newStart = input.start_time ?? (existing.start_time as unknown as string);
    const newEnd = input.end_time ?? (existing.end_time as unknown as string);

    await this.ensureNoOverlaps(
      existing.user_id,
      newStart,
      newEnd,
      id
    );

    const updateData: {
      updated_at: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      linked_task_id?: string | null;
      description?: string;
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

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }

    return data;
  }

  // Delete calendar event
  async deleteCalendarEvent(id: string): Promise<boolean> {
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
  ): Promise<CalendarEvent[]> {
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
  async getCalendarEventsByTaskId(taskId: string): Promise<CalendarEvent[]> {
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

}
