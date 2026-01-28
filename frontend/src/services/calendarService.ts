import type { CalendarEventTask, CalendarEventUnion } from '@/types';
import { isCalendarEventTask } from '@/types';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/types';
import { request } from './apiClient';
import {
  toCalendarEventUnion,
  toCalendarEventUnions,
  type UnknownRecord,
} from './transforms';

class CalendarService {
  async getAllCalendarEvents(): Promise<CalendarEventUnion[]> {
    const response = await request<CalendarEventUnion[]>('/calendar-events');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    return toCalendarEventUnions(response.data as unknown as UnknownRecord[]);
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

    return toCalendarEventUnions(response.data as unknown as UnknownRecord[]);
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

    return toCalendarEventUnions(
      response.data as unknown as UnknownRecord[]
    ).filter(isCalendarEventTask) as CalendarEventTask[];
  }

  async getCalendarEventById(id: string): Promise<CalendarEventUnion> {
    const response = await request<CalendarEventUnion>(
      `/calendar-events/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar event');
    }

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
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

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
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

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
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
   * Batch delete multiple calendar events using the backend batch endpoint
   * Returns array of results with success/failure status for each event
   */
  async deleteCalendarEventsBatch(ids: string[]): Promise<
    Array<{
      success: boolean;
      id: string;
      error?: string;
    }>
  > {
    if (ids.length === 0) {
      return [];
    }

    try {
      const response = await request<{
        results: Array<{
          success: boolean;
          id: string;
          error?: string;
        }>;
        total: number;
        successful: number;
        failed: number;
      }>('/calendar-events/batch', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error || 'Failed to delete calendar events batch'
        );
      }

      return response.data.results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // If batch delete fails entirely, return failure for all events
      return ids.map(id => ({
        success: false,
        id,
        error: errorMessage,
      }));
    }
  }

  /**
   * Batch create multiple calendar events using the backend batch endpoint
   * Returns array of results with success/failure status for each event
   * The backend handles overlap checking and excludes events in the same batch
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
    try {
      // Send all events as an array to the batch endpoint
      const response = await request<{
        results: Array<{
          success: boolean;
          event?: CalendarEventUnion;
          error?: string;
          index: number;
        }>;
        total: number;
        successful: number;
        failed: number;
      }>('/calendar-events', {
        method: 'POST',
        body: JSON.stringify(events),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error || 'Failed to create calendar events batch'
        );
      }

      // Transform events in results to CalendarEventUnion format
      const transformedResults = response.data.results.map(result => ({
        ...result,
        event: result.event
          ? toCalendarEventUnion(result.event as unknown as UnknownRecord)
          : undefined,
      }));

      return transformedResults;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // If batch creation fails entirely, return failure for all events
      return events.map((_, index) => ({
        success: false,
        error: errorMessage,
        index,
      }));
    }
  }
}

export const calendarService = new CalendarService();
