import type { Schedule, UserSettings } from '@/../../../shared/types';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class UserSettingsService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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

  // Get active schedule for user (or default)
  async getActiveSchedule(userId: string): Promise<Schedule> {
    const response = await this.request<Schedule>(
      `/api/user-settings/active-schedule?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      // Return default schedule if not found
      return {
        id: '',
        user_id: userId,
        name: 'Default',
        working_hours_start: 9,
        working_hours_end: 22,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Get all schedules for user
  async getUserSchedules(userId: string): Promise<Schedule[]> {
    const response = await this.request<Schedule[]>(
      `/api/user-settings/schedules?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      return [];
    }

    return response.data.map(s => ({
      ...s,
      created_at: new Date(s.created_at),
      updated_at: new Date(s.updated_at),
    }));
  }

  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const response = await this.request<UserSettings>(
      `/api/user-settings?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      return null;
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Create a new schedule
  async createSchedule(
    userId: string,
    name: string,
    workingHoursStart: number,
    workingHoursEnd: number,
    isDefault = false
  ): Promise<Schedule> {
    const response = await this.request<Schedule>(
      '/api/user-settings/schedules',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          name,
          working_hours_start: workingHoursStart,
          working_hours_end: workingHoursEnd,
          is_default: isDefault,
        }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Update a schedule
  async updateSchedule(
    scheduleId: string,
    userId: string,
    name: string,
    workingHoursStart: number,
    workingHoursEnd: number
  ): Promise<Schedule> {
    const response = await this.request<Schedule>(
      `/api/user-settings/schedules/${scheduleId}?user_id=${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name,
          working_hours_start: workingHoursStart,
          working_hours_end: workingHoursEnd,
        }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Update user settings to set active schedule
  async setActiveSchedule(
    userId: string,
    scheduleId: string | null
  ): Promise<UserSettings> {
    const response = await this.request<UserSettings>(
      `/api/user-settings?user_id=${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          active_schedule_id: scheduleId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update active schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }
}

export const userSettingsService = new UserSettingsService();
