import type { CalendarEvent } from '@/../../../shared/types';
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

  async getAllCalendarEvents(): Promise<CalendarEvent[]> {
    const response = await this.request<CalendarEvent[]>(
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
    }));
  }

  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    console.log('[CalendarService] getCalendarEventsByDateRange called:', {
      startDate,
      endDate,
    });

    const response = await this.request<CalendarEvent[]>(
      `/api/calendar-events?start_date=${startDate}&end_date=${endDate}`
    );

    console.log('[CalendarService] getCalendarEventsByDateRange response:', {
      success: response.success,
      count: response.data?.length || 0,
      error: response.error,
      events: response.data?.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: e.linked_task_id,
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
    }));

    console.log('[CalendarService] Transformed calendar events:', {
      count: transformed.length,
      events: transformed.map(e => ({
        id: e.id,
        title: e.title,
        linked_task_id: e.linked_task_id,
        start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      })),
    });

    return transformed;
  }

  async getCalendarEventById(id: string): Promise<CalendarEvent> {
    const response = await this.request<CalendarEvent>(
      `/api/calendar-events/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar event');
    }

    return {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEvent> {
    console.log('[CalendarService] createCalendarEvent called with input:', input);

    const response = await this.request<CalendarEvent>('/api/calendar-events', {
      method: 'POST',
      body: JSON.stringify(input),
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

    console.log('[CalendarService] Created calendar event (transformed):', result);
    return result;
  }

  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEvent> {
    const response = await this.request<CalendarEvent>(
      `/api/calendar-events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
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

    return {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
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
}

export const calendarService = new CalendarService();
