import { getApiBaseUrl, request } from './apiClient';

export interface GoogleCalendarStatus {
  connected: boolean;
  last_synced_at: string | null;
}

export interface SyncResult {
  synced: number;
  errors: string[];
}

class GoogleCalendarService {
  /**
   * Get OAuth URL to initiate Google Calendar connection
   */
  getAuthUrl(userId: string): string {
    return `${getApiBaseUrl()}/google-calendar/auth?user_id=${userId}`;
  }

  /**
   * Get connection status
   */
  async getStatus(userId: string): Promise<GoogleCalendarStatus> {
    const response = await request<GoogleCalendarStatus>(
      `/google-calendar/status?user_id=${userId}`
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
    const response = await request<SyncResult>('/google-calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to sync events');
    }

    return response.data;
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    const response = await request<null>('/google-calendar/disconnect', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
