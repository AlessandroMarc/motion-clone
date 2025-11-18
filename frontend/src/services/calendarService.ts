import type { CalendarEvent, CalendarEventTask, CalendarEventUnion } from '@/../../../shared/types';
import { isCalendarEventTask } from '@/../../../shared/types';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/../../../backend/src/types/database';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  count?: number;
}

class CalendarService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('[CalendarService] Making API request:', {
        url,
        method: options.method || 'GET',
        hasBody: !!options.body,
        body: options.body ? JSON.parse(options.body as string) : undefined,
      });

      // Get auth token
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[CalendarService] Auth token present');
      } else {
        console.warn('[CalendarService] No auth token found');
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('[CalendarService] API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CalendarService] API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('[CalendarService] API response data:', {
        success: data.success,
        message: data.message,
        hasData: !!data.data,
        dataCount: Array.isArray(data.data) ? data.data.length : data.data ? 1 : 0,
        error: data.error,
      });
      return data;
    } catch (error) {
      console.error('[CalendarService] API request failed:', error);
      console.error('[CalendarService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        message: 'Failed to connect to the server',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAllCalendarEvents(): Promise<CalendarEventUnion[]> {
    const response = await this.request<CalendarEventUnion[]>(
      '/api/calendar-events'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    // Transform date strings to Date objects
    return response.data.map(event => ({
      ...event,
      start_time: new Date(event.start_time),
      end_time: new Date(event.end_time),
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at),
      ...(isCalendarEventTask(event) && {
        completed_at: event.completed_at ? new Date(event.completed_at) : null,
      }),
    })) as CalendarEventUnion[];
  }

  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventUnion[]> {
    console.log('[CalendarService] getCalendarEventsByDateRange called:', {
      startDate,
      endDate,
    });

    const response = await this.request<CalendarEventUnion[]>(
      `/api/calendar-events?start_date=${startDate}&end_date=${endDate}`
    );

    console.log('[CalendarService] getCalendarEventsByDateRange response:', {
      success: response.success,
      count: response.data?.length || 0,
      error: response.error,
      events: response.data?.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: isCalendarEventTask(e) ? e.linked_task_id : undefined,
        start_time: e.start_time,
      })),
    });

    if (!response.success || !response.data) {
      console.error('[CalendarService] Failed to fetch calendar events:', {
        error: response.error,
        message: response.message,
      });
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    // Transform date strings to Date objects
    const transformed = response.data.map(event => ({
      ...event,
      start_time: new Date(event.start_time),
      end_time: new Date(event.end_time),
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at),
      ...(isCalendarEventTask(event) && {
        completed_at: event.completed_at ? new Date(event.completed_at) : null,
      }),
    })) as CalendarEventUnion[];

    console.log('[CalendarService] Transformed calendar events:', {
      count: transformed.length,
      events: transformed.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: isCalendarEventTask(e) ? e.linked_task_id : undefined,
        start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      })),
    });

    return transformed;
  }

  async getCalendarEventsByTaskId(taskId: string): Promise<CalendarEventTask[]> {
    console.log('[CalendarService] getCalendarEventsByTaskId called:', {
      taskId,
    });

    const response = await this.request<CalendarEventTask[]>(
      `/api/calendar-events?task_id=${taskId}`
    );

    if (!response.success || !response.data) {
      console.error('[CalendarService] Failed to fetch task-linked events:', {
        taskId,
        error: response.error,
        message: response.message,
      });
      throw new Error(response.error || 'Failed to fetch linked calendar events');
    }

    return response.data.map(event => ({
      ...event,
      start_time: new Date(event.start_time),
      end_time: new Date(event.end_time),
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at),
      completed_at: event.completed_at ? new Date(event.completed_at) : null,
    })) as CalendarEventTask[];
  }

  async getCalendarEventById(id: string): Promise<CalendarEventUnion> {
    const response = await this.request<CalendarEventUnion>(
      `/api/calendar-events/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar event');
    }

    const result = {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };

    if (isCalendarEventTask(response.data)) {
      return {
        ...result,
        linked_task_id: response.data.linked_task_id,
        completed_at: response.data.completed_at
          ? new Date(response.data.completed_at)
          : null,
      } as CalendarEventTask;
    }

    return result as CalendarEvent;
  }

  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    console.log('[CalendarService] createCalendarEvent called with input:', input);

    const payload = {
      ...input,
      completed_at:
        input.completed_at && typeof input.completed_at === 'object' && 'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : input.completed_at ?? null,
    };

    const response = await this.request<CalendarEventUnion>('/api/calendar-events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[CalendarService] createCalendarEvent response:', {
      success: response.success,
      data: response.data,
      error: response.error,
      message: response.message,
    });

    if (!response.success || !response.data) {
      console.error('[CalendarService] Failed to create calendar event:', {
        error: response.error,
        message: response.message,
        fullResponse: response,
      });
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error('This event overlaps an existing one. Choose a different time.');
      }
      throw new Error(response.error || response.message || 'Failed to create calendar event');
    }

    const result = {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };

    if (isCalendarEventTask(response.data)) {
      const taskResult = {
        ...result,
        linked_task_id: response.data.linked_task_id,
        completed_at: response.data.completed_at
          ? new Date(response.data.completed_at)
          : null,
      } as CalendarEventTask;
      console.log('[CalendarService] Created calendar event task (transformed):', taskResult);
      return taskResult;
    }

    console.log('[CalendarService] Created calendar event (transformed):', result);
    return result as CalendarEvent;
  }

  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    const payload = {
      ...input,
      completed_at:
        input.completed_at && typeof input.completed_at === 'object' && 'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : input.completed_at !== undefined
            ? input.completed_at
            : undefined,
    };

    const response = await this.request<CalendarEventUnion>(
      `/api/calendar-events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    if (!response.success || !response.data) {
      console.error('[CalendarService] Failed to update calendar event:', {
        error: response.error,
        message: response.message,
      });
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error('This event overlaps an existing one. Choose a different time.');
      }
      throw new Error(response.error || response.message || 'Failed to update calendar event');
    }

    const result = {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };

    if (isCalendarEventTask(response.data)) {
      return {
        ...result,
        linked_task_id: response.data.linked_task_id,
        completed_at: response.data.completed_at
          ? new Date(response.data.completed_at)
          : null,
      } as CalendarEventTask;
    }

    return result as CalendarEvent;
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    const response = await this.request<null>(`/api/calendar-events/${id}`, {
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
  ): Promise<Array<{ success: boolean; event?: CalendarEventUnion; error?: string; index: number }>> {
    const results = await Promise.allSettled(
      events.map((eventData, index) =>
        this.createCalendarEvent(eventData).then(
          event => ({ success: true, event, index }),
          error => ({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            index,
          })
        )
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        success: false,
        error: result.reason?.message || 'Unknown error',
        index,
      };
    });
  }
}

export const calendarService = new CalendarService();
