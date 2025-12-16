import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';
import { CalendarEventService } from './calendarEventService.js';
import { getGoogleOAuthEnv } from '../config/env.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - try multiple paths
const envPath = path.join(process.cwd(), '..', '.env');
const envResult = dotenv.config({ path: envPath });

// Also try loading from current directory
if (envResult.error) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
}

function getOAuthConfigOrThrow() {
  // Validates required vars and URL format (no defaults).
  return getGoogleOAuthEnv();
}

// Helpful startup log (without leaking secrets)
try {
  const cfg = getOAuthConfigOrThrow();
  console.log('[GoogleCalendarService] Google OAuth env loaded:', {
    envPath,
    hasClientId: !!cfg.clientId,
    hasClientSecret: !!cfg.clientSecret,
    redirectUri: cfg.redirectUri,
  });
} catch (e) {
  console.warn(
    '[GoogleCalendarService] Google OAuth env not configured; Google Calendar integration endpoints will fail until env vars are set.',
    e instanceof Error ? e.message : e
  );
}

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

interface GoogleCalendarToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export class GoogleCalendarService {
  private calendarEventService: CalendarEventService;

  constructor() {
    this.calendarEventService = new CalendarEventService();
  }

  /**
   * Generate OAuth2 URL for Google Calendar authorization
   */
  initiateOAuth(userId: string): string {
    const { clientId, clientSecret, redirectUri } = getOAuthConfigOrThrow();

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: userId, // Pass userId in state for security
    });

    return authUrl;
  }

  /**
   * Handle OAuth callback and save tokens
   */
  async handleOAuthCallback(
    code: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { clientId, clientSecret, redirectUri } = getOAuthConfigOrThrow();

    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain tokens from Google');
      }

      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Save or update tokens in database
      const { error } = await supabase.from('google_calendar_tokens').upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) {
        console.error('[GoogleCalendarService] Failed to save tokens:', error);
        throw new Error(`Failed to save tokens: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[GoogleCalendarService] OAuth callback error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user's Google Calendar tokens
   */
  private async getTokens(userId: string): Promise<GoogleCalendarToken | null> {
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No tokens found
      }
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    return data;
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(userId: string): Promise<string> {
    const { clientId, clientSecret, redirectUri } = getOAuthConfigOrThrow();

    const tokens = await this.getTokens(userId);
    if (!tokens) {
      throw new Error('No Google Calendar tokens found for user');
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Update tokens in database
    const { error } = await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        ...(credentials.refresh_token && {
          refresh_token: credentials.refresh_token,
        }),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update tokens: ${error.message}`);
    }

    return credentials.access_token;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await this.getTokens(userId);
    if (!tokens) {
      throw new Error('No Google Calendar tokens found for user');
    }

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    // Refresh token if it expires in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshAccessToken(userId);
    }

    return tokens.access_token;
  }

  /**
   * Sync events from Google Calendar
   */
  async syncEventsFromGoogle(userId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    try {
      const { clientId, clientSecret, redirectUri } = getOAuthConfigOrThrow();
      const accessToken = await this.getValidAccessToken(userId);
      const tokens = await this.getTokens(userId);
      if (!tokens) {
        throw new Error('No Google Calendar tokens found for user');
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: tokens.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get events from last 30 days and next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const response = await calendar.events.list({
        calendarId: tokens.calendar_id || 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500, // Google Calendar API limit
      });

      const googleEvents = response.data.items || [];
      const errors: string[] = [];
      let synced = 0;

      for (const googleEvent of googleEvents) {
        try {
          if (!googleEvent.id || !googleEvent.start || !googleEvent.end) {
            continue; // Skip events without required fields
          }

          const startTime =
            googleEvent.start.dateTime || googleEvent.start.date;
          const endTime = googleEvent.end.dateTime || googleEvent.end.date;

          if (!startTime || !endTime) {
            continue;
          }

          // Check if event already exists
          const existingEvent =
            await this.calendarEventService.getCalendarEventByGoogleEventId(
              userId,
              googleEvent.id
            );

          const eventData: {
            title: string;
            description?: string;
            start_time: string;
            end_time: string;
            user_id: string;
            google_event_id: string;
            synced_from_google: boolean;
          } = {
            title: googleEvent.summary || 'Untitled Event',
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            user_id: userId,
            google_event_id: googleEvent.id,
            synced_from_google: true,
          };

          if (googleEvent.description) {
            eventData.description = googleEvent.description;
          }

          if (existingEvent) {
            // Update existing event
            const updateData: {
              title: string;
              start_time: string;
              end_time: string;
              description?: string;
            } = {
              title: eventData.title,
              start_time: eventData.start_time,
              end_time: eventData.end_time,
            };
            if (eventData.description !== undefined) {
              updateData.description = eventData.description;
            }
            await this.calendarEventService.updateCalendarEvent(
              existingEvent.id,
              updateData
            );
          } else {
            // Create new event
            await this.calendarEventService.createCalendarEvent(eventData);
          }

          synced++;
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? error.message
              : `Failed to sync event ${googleEvent.id}`;
          errors.push(errorMsg);
          console.error(
            `[GoogleCalendarService] Error syncing event ${googleEvent.id}:`,
            error
          );
        }
      }

      // Update last_synced_at
      await supabase
        .from('google_calendar_tokens')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return { success: true, synced, errors };
    } catch (error) {
      console.error('[GoogleCalendarService] Sync error:', error);
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
      };
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnectGoogleCalendar(userId: string): Promise<void> {
    const { error } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Check if user has Google Calendar connected
   */
  async isConnected(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId);
    return tokens !== null;
  }

  /**
   * Get connection status with last sync time
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    last_synced_at: string | null;
  }> {
    const tokens = await this.getTokens(userId);
    return {
      connected: tokens !== null,
      last_synced_at: tokens?.last_synced_at || null,
    };
  }
}
