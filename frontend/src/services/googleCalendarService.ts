import { getApiBaseUrl, request } from './apiClient';

export interface GoogleCalendarStatus {
  connected: boolean;
  last_synced_at: string | null;
  isExpired?: boolean;
}

export interface FilteredGoogleEvent {
  title: string;
  start_time: string;
  end_time: string;
  reason: 'free' | 'declined';
}

export interface SyncResult {
  synced: number;
  errors: string[];
  durationMs: number;
  filtered?: {
    count: number;
    events: FilteredGoogleEvent[];
  };
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

    // handle invalid_grant case where backend returns auth expired error
    if (!response.success) {
      const errorMsg = response.error || '';
      if (
        errorMsg.includes('authorization expired') ||
        errorMsg.includes('invalid_grant') ||
        errorMsg.includes('Token has been expired')
      ) {
        // construct a SyncResult with sentinel error so callers can react
        return {
          synced: 0,
          errors: [
            'google_calendar_invalid_grant',
            response.error || 'Authorization expired',
          ],
          durationMs: 0,
          filtered: { count: 0, events: [] },
        };
      }
      throw new Error(response.error || 'Failed to sync events');
    }

    if (!response.data) {
      throw new Error('Failed to sync events');
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
