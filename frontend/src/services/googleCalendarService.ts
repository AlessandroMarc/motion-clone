import { getAuthToken } from '@/lib/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3003');

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  last_synced_at: string | null;
}

export interface SyncResult {
  synced: number;
  errors: string[];
}

class GoogleCalendarService {
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
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[GoogleCalendarService] API request failed:', error);
      return {
        success: false,
        message: 'Failed to connect to the server',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get OAuth URL to initiate Google Calendar connection
   */
  getAuthUrl(userId: string): string {
    return `${API_BASE_URL}/api/google-calendar/auth?user_id=${userId}`;
  }

  /**
   * Get connection status
   */
  async getStatus(userId: string): Promise<GoogleCalendarStatus> {
    const response = await this.request<GoogleCalendarStatus>(
      `/api/google-calendar/status?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch connection status');
    }

    return response.data;
  }

  /**
   * Manually sync events from Google Calendar
   */
  async sync(userId: string): Promise<SyncResult> {
    const response = await this.request<SyncResult>(
      '/api/google-calendar/sync',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to sync events');
    }

    return response.data;
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    const response = await this.request<null>(
      '/api/google-calendar/disconnect',
      {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();


