import { supabase } from '../config/supabase.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import type { CalendarEvent } from '@shared/types.js';

export class CalendarEventService {
  // Create a new calendar event
  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([
        {
          title: input.title,
          start_time: input.start_time,
          end_time: input.end_time,
          linked_task_id: input.linked_task_id,
          linked_project_id: input.linked_project_id,
          description: input.description,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

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
    const updateData: {
      updated_at: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      linked_task_id?: string | null;
      linked_project_id?: string | null;
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
    if (input.linked_project_id !== undefined)
      updateData.linked_project_id = input.linked_project_id;
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
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch calendar events by date range: ${error.message}`
      );
    }

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

  // Get calendar events linked to a project
  async getCalendarEventsByProjectId(
    projectId: string
  ): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('linked_project_id', projectId)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch calendar events by project: ${error.message}`
      );
    }

    return data || [];
  }
}
