import type {
  CalendarEventTask,
  CalendarEventUnion,
} from '@shared/types';
import { isCalendarEventTask } from '@shared/types';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@shared/types';
import { request } from './apiClient';
import { toCalendarEventUnion, toCalendarEventUnions } from './transforms';

class CalendarService {
  async getAllCalendarEvents(): Promise<CalendarEventUnion[]> {
    const response = await request<CalendarEventUnion[]>('/calendar-events');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    return toCalendarEventUnions(response.data as any[]);
  }

  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventUnion[]> {
    const response = await request<CalendarEventUnion[]>(
      `/calendar-events?start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    return toCalendarEventUnions(response.data as any[]);
  }

  async getCalendarEventsByTaskId(
    taskId: string
  ): Promise<CalendarEventTask[]> {
    const response = await request<CalendarEventTask[]>(
      `/calendar-events?task_id=${taskId}`
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.error || 'Failed to fetch linked calendar events'
      );
    }

    return toCalendarEventUnions(response.data as any[]).filter(
      isCalendarEventTask
    ) as CalendarEventTask[];
  }

  async getCalendarEventById(id: string): Promise<CalendarEventUnion> {
    const response = await request<CalendarEventUnion>(
      `/calendar-events/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar event');
    }

    return toCalendarEventUnion(response.data as any);
  }

  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    const payload = {
      ...input,
      completed_at:
        input.completed_at &&
        typeof input.completed_at === 'object' &&
        'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : (input.completed_at ?? null),
    };

    const response = await request<CalendarEventUnion>('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error(
          'This event overlaps an existing one. Choose a different time.'
        );
      }
      throw new Error(
        response.error || response.message || 'Failed to create calendar event'
      );
    }

    return toCalendarEventUnion(response.data as any);
  }

  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    const payload = {
      ...input,
      completed_at:
        input.completed_at &&
        typeof input.completed_at === 'object' &&
        'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : input.completed_at !== undefined
            ? input.completed_at
            : undefined,
    };

    const response = await request<CalendarEventUnion>(
      `/calendar-events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    if (!response.success || !response.data) {
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error(
          'This event overlaps an existing one. Choose a different time.'
        );
      }
      throw new Error(
        response.error || response.message || 'Failed to update calendar event'
      );
    }

    return toCalendarEventUnion(response.data as any);
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    const response = await request<null>(`/calendar-events/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete calendar event');
    }

    return true;
  }

  /**
   * Batch create multiple calendar events
   * Returns array of results with success/failure status for each event
   * Creates events sequentially to avoid overlap issues
   * If an event fails due to overlap, it will be skipped and the next event will be tried
   */
  async createCalendarEventsBatch(
    events: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id?: string;
      user_id: string;
      completed_at?: string | null;
    }>
  ): Promise<
    Array<{
      success: boolean;
      event?: CalendarEventUnion;
      error?: string;
      index: number;
    }>
  > {
    // Create events sequentially to ensure overlap checks work correctly
    // Each event is checked against all previously created events
    const results: Array<{
      success: boolean;
      event?: CalendarEventUnion;
      error?: string;
      index: number;
    }> = [];

    for (let index = 0; index < events.length; index++) {
      const eventData = events[index];
      try {
        const event = await this.createCalendarEvent(eventData);
        results.push({ success: true, event, index });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const isOverlapError = errorMessage.includes('overlaps');

        results.push({
          success: false,
          error: errorMessage,
          index,
        });

        // If it's an overlap error, continue with next event
        // The scheduling logic should have prevented this, but we'll skip it anyway
        if (isOverlapError) {
          console.log('Overlap error:', errorMessage);
        }
      }
    }

    return results;
  }
}

export const calendarService = new CalendarService();
