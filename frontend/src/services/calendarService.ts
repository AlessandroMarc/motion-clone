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
      console.log('Making API request to:', url);

      // Get auth token
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
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
    const response = await this.request<CalendarEvent[]>(
      `/api/calendar-events?start_date=${startDate}&end_date=${endDate}`
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
    const response = await this.request<CalendarEvent>('/api/calendar-events', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create calendar event');
    }

    return {
      ...response.data,
      start_time: new Date(response.data.start_time),
      end_time: new Date(response.data.end_time),
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
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
      throw new Error(response.error || 'Failed to update calendar event');
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
