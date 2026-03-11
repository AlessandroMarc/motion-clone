import { google } from 'googleapis';
import { serviceRoleSupabase } from '../config/supabase.js';
import { CalendarEventService } from './calendarEventService.js';
import { getGoogleOAuthEnv } from '../config/env.js';
import { loadEnv } from '../config/loadEnv.js';
import type { CalendarEventUnion } from '../types/database.js';
import { autoScheduleTriggerQueue } from './autoScheduleTriggerQueue.js';

/**
 * Load environment variables and return the validated Google OAuth configuration.
 *
 * @returns The Google OAuth configuration (clientId, clientSecret, redirectUri).
 * @throws If any required OAuth environment variable is missing or malformed (e.g., clientId, clientSecret, or redirectUri).
 */
function getOAuthConfigOrThrow() {
  loadEnv();
  // Validates required vars and URL format (no defaults).
  return getGoogleOAuthEnv();
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
  private static inFlightSyncs = new Map<
    string,
    Promise<{
      success: boolean;
      synced: number;
      errors: string[];
      durationMs: number;
      filtered: {
        count: number;
        events: Array<{
          title: string;
          start_time: string;
          end_time: string;
          reason: 'free' | 'declined';
        }>;
      };
    }>
  >();

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
      const { error } = await serviceRoleSupabase
        .from('google_calendar_tokens')
        .upsert(
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
    const { data, error } = await serviceRoleSupabase
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
    const { error } = await serviceRoleSupabase
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
  async syncEventsFromGoogle(
    userId: string,
    authToken?: string
  ): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
    durationMs: number;
    filtered: {
      count: number;
      events: Array<{
        title: string;
        start_time: string;
        end_time: string;
        reason: 'free' | 'declined';
      }>;
    };
  }> {
    const existingSync = GoogleCalendarService.inFlightSyncs.get(userId);
    if (existingSync) {
      console.log(
        `[GoogleCalendarService] Sync already in progress for user ${userId}, reusing in-flight sync`
      );
      return existingSync;
    }

    const syncPromise = this.performSyncEventsFromGoogle(userId, authToken)
      .catch(error => {
        console.error('[GoogleCalendarService] Sync error:', error);
        return {
          success: false,
          synced: 0,
          errors: [
            error instanceof Error ? error.message : 'Unknown sync error',
          ],
          durationMs: 0,
          filtered: {
            count: 0,
            events: [] as Array<{
              title: string;
              start_time: string;
              end_time: string;
              reason: 'free' | 'declined';
            }>,
          },
        };
      })
      .finally(() => {
        GoogleCalendarService.inFlightSyncs.delete(userId);
      });

    GoogleCalendarService.inFlightSyncs.set(userId, syncPromise);
    return syncPromise;
  }

  private async performSyncEventsFromGoogle(
    userId: string,
    authToken?: string
  ): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
    durationMs: number;
    filtered: {
      count: number;
      events: Array<{
        title: string;
        start_time: string;
        end_time: string;
        reason: 'free' | 'declined';
      }>;
    };
  }> {
    const startTime = Date.now();
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
      const filteredEvents: Array<{
        title: string;
        start_time: string;
        end_time: string;
        reason: 'free' | 'declined';
      }> = [];
      const eventsToDeleteIds: string[] = [];

      console.log(
        `[GoogleCalendarService] Processing ${googleEvents.length} events from Google Calendar`
      );

      // Batch fetch ALL existing Google Calendar events for this user
      const fetchStart = Date.now();
      const existingGoogleEvents =
        await this.calendarEventService.getAllGoogleCalendarEventsByUserId(
          userId
        );
      const fetchDuration = Date.now() - fetchStart;
      console.log(
        `[GoogleCalendarService] Fetched ${existingGoogleEvents.length} existing events in ${fetchDuration}ms`
      );

      // Build a Map for O(1) lookup by google_event_id
      const existingEventsMap = new Map<string, CalendarEventUnion>();
      for (const event of existingGoogleEvents) {
        const googleEventId = (
          event as unknown as { google_event_id?: string | null }
        ).google_event_id;
        if (googleEventId) {
          existingEventsMap.set(googleEventId, event);
        }
      }

      // Batch collections
      const eventsToCreate: Array<{
        title: string;
        description?: string;
        start_time: string;
        end_time: string;
        user_id: string;
        google_event_id: string;
        synced_from_google: boolean;
      }> = [];
      const eventsToUpdate: Array<{
        id: string;
        data: {
          title: string;
          start_time: string;
          end_time: string;
          description?: string;
          synced_from_google?: boolean;
        };
      }> = [];
      let skipped = 0;

      // First pass: classify events into create/update/skip
      const classifyStart = Date.now();
      for (const googleEvent of googleEvents) {
        try {
          if (!googleEvent.id || !googleEvent.start || !googleEvent.end) {
            skipped++;
            continue; // Skip events without required fields
          }

          const startTime =
            googleEvent.start.dateTime || googleEvent.start.date;
          const endTime = googleEvent.end.dateTime || googleEvent.end.date;

          if (!startTime || !endTime) {
            skipped++;
            continue;
          }

          // Check if event already exists using Map lookup (O(1) instead of query)
          const existingEvent = googleEvent.id
            ? existingEventsMap.get(googleEvent.id)
            : null;

          // Skip events that are free (shown as available) or declined by the user —
          // they should not block time in the task scheduler. If they were previously
          // synced, remove them from the DB.
          const isFree = googleEvent.transparency === 'transparent';
          const isDeclined =
            googleEvent.attendees?.some(
              a => a.self === true && a.responseStatus === 'declined'
            ) ?? false;

          if (isFree || isDeclined) {
            skipped++;
            filteredEvents.push({
              title: googleEvent.summary || 'Untitled Event',
              start_time: new Date(startTime).toISOString(),
              end_time: new Date(endTime).toISOString(),
              reason: isDeclined ? 'declined' : 'free',
            });
            // If it was previously synced, delete it from DB
            if (existingEvent) {
              eventsToDeleteIds.push(existingEvent.id);
            }
            continue;
          }

          const incomingDescription = googleEvent.description ?? undefined;

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

          if (incomingDescription !== undefined) {
            eventData.description = incomingDescription;
          }

          if (existingEvent) {
            const normalizeDate = (
              value: string | Date | null | undefined
            ): string | null => {
              if (!value) return null;
              const date = new Date(value);
              if (Number.isNaN(date.getTime())) return null;
              return date.toISOString();
            };

            const existingStart = normalizeDate(
              (
                existingEvent as unknown as {
                  start_time?: string | Date | null;
                }
              ).start_time
            );
            const existingEnd = normalizeDate(
              (
                existingEvent as unknown as {
                  end_time?: string | Date | null;
                }
              ).end_time
            );
            const existingTitle =
              (
                existingEvent as unknown as {
                  title?: string | null;
                }
              ).title ?? '';
            const existingDescription =
              (
                existingEvent as unknown as {
                  description?: string | null;
                }
              ).description ?? undefined;
            const existingSyncedFromGoogle =
              (
                existingEvent as unknown as {
                  synced_from_google?: boolean | null;
                }
              ).synced_from_google ?? false;

            const effectiveDescription =
              incomingDescription === undefined
                ? existingDescription
                : incomingDescription;

            const isUnchanged =
              existingTitle === eventData.title &&
              existingStart === normalizeDate(eventData.start_time) &&
              existingEnd === normalizeDate(eventData.end_time) &&
              existingDescription === effectiveDescription &&
              existingSyncedFromGoogle === true;

            if (isUnchanged) {
              synced++;
              continue;
            }

            // Queue for batch update
            const updateData: {
              title: string;
              start_time: string;
              end_time: string;
              description?: string;
              synced_from_google?: boolean;
            } = {
              title: eventData.title,
              start_time: eventData.start_time,
              end_time: eventData.end_time,
            };
            if (
              incomingDescription !== undefined &&
              incomingDescription !== existingDescription
            ) {
              updateData.description = incomingDescription;
            }
            if (!existingSyncedFromGoogle) {
              updateData.synced_from_google = true;
            }
            eventsToUpdate.push({ id: existingEvent.id, data: updateData });
          } else {
            // Queue for batch create
            eventsToCreate.push(eventData);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? error.message
              : `Failed to process event ${googleEvent.id}`;
          errors.push(errorMsg);
          skipped++;
        }
      }
      const classifyDuration = Date.now() - classifyStart;
      console.log(
        `[GoogleCalendarService] Classified events in ${classifyDuration}ms: ${eventsToCreate.length} to create, ${eventsToUpdate.length} to update, ${skipped} skipped`
      );

      // Second pass: batch create events
      if (eventsToCreate.length > 0) {
        console.log(
          `[GoogleCalendarService] Creating ${eventsToCreate.length} new events`
        );
        try {
          const createResults =
            await this.calendarEventService.createCalendarEventsBatch(
              eventsToCreate
            );
          const successfulCreates = createResults.filter(r => r.success).length;
          synced += successfulCreates;

          const failedCreates = createResults.filter(r => !r.success);
          if (failedCreates.length > 0) {
            failedCreates.forEach(result => {
              if (result.error) {
                errors.push(result.error);
              }
            });
            console.warn(
              `[GoogleCalendarService] ${failedCreates.length} events failed to create`
            );
          }
        } catch (error) {
          errors.push(
            `Batch create failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          console.error('[GoogleCalendarService] Batch create error:', error);
        }
      }

      // Second pass (b): batch delete free/declined events that were previously synced
      if (eventsToDeleteIds.length > 0) {
        console.log(
          `[GoogleCalendarService] Deleting ${eventsToDeleteIds.length} free/declined events`
        );
        await serviceRoleSupabase
          .from('calendar_events')
          .delete()
          .in('id', eventsToDeleteIds);
      }

      // Third pass: batch update events with bounded concurrency
      if (eventsToUpdate.length > 0) {
        console.log(
          `[GoogleCalendarService] Updating ${eventsToUpdate.length} existing events`
        );
        const CONCURRENCY = 5;
        let updateSuccessCount = 0;
        for (let i = 0; i < eventsToUpdate.length; i += CONCURRENCY) {
          const batch = eventsToUpdate.slice(i, i + CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map(({ id, data }) =>
              this.calendarEventService.updateCalendarEvent(
                id,
                data,
                undefined,
                true
              )
            )
          );
          for (const result of results) {
            if (result.status === 'fulfilled') {
              updateSuccessCount++;
            } else {
              const rejected = result as PromiseRejectedResult;
              const idx = results.indexOf(result);
              const item = batch[idx];
              errors.push(
                `Failed to update event ${item?.id ?? 'unknown'}: ${
                  rejected.reason instanceof Error
                    ? rejected.reason.message
                    : 'Unknown error'
                }`
              );
            }
          }
        }
        synced += updateSuccessCount;
        if (eventsToUpdate.length - updateSuccessCount > 0) {
          console.warn(
            `[GoogleCalendarService] ${eventsToUpdate.length - updateSuccessCount} events failed to update`
          );
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(
        `[GoogleCalendarService] Sync complete: ${synced} synced, ${skipped} skipped, ${errors.length} errors, ${durationMs}ms (fetch: ${fetchDuration}ms, classify: ${classifyDuration}ms)`
      );

      // Update last_synced_at
      await serviceRoleSupabase
        .from('google_calendar_tokens')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Trigger auto-schedule asynchronously (fire-and-forget)
      if (authToken) {
        autoScheduleTriggerQueue.trigger(userId, authToken);
      }

      return {
        success: true,
        synced,
        errors,
        durationMs,
        filtered: { count: filteredEvents.length, events: filteredEvents },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      let errorMsg =
        error instanceof Error ? error.message : 'Unknown sync error';
      // Detect Google OAuth invalid_grant error
      if (
        errorMsg.includes('invalid_grant') ||
        errorMsg.includes('Token has been expired or revoked') ||
        errorMsg.includes('refresh token is not set')
      ) {
        errorMsg = 'Google Calendar authorization expired. Please reconnect.';
        // delete tokens so status becomes disconnected
        try {
          await serviceRoleSupabase
            .from('google_calendar_tokens')
            .delete()
            .eq('user_id', userId);
        } catch {
          console.warn('[GoogleCalendarService] Failed to delete expired tokens for user:', userId);  
        }
        // Use sentinel error string for detection
        return {
          success: false,
          synced: 0,
          errors: ['google_calendar_invalid_grant', errorMsg],
          durationMs,
          filtered: { count: 0, events: [] },
        };
      }
      return {
        success: false,
        synced: 0,
        errors: [errorMsg],
        durationMs,
        filtered: { count: 0, events: [] },
      };
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnectGoogleCalendar(userId: string): Promise<void> {
    const { error } = await serviceRoleSupabase
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
    isExpired: boolean;
  }> {
    const tokens = await this.getTokens(userId);
    if (!tokens) {
      return {
        connected: false,
        last_synced_at: null,
        isExpired: false,
      };
    }

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const isExpired = expiresAt.getTime() <= now.getTime();

    return {
      connected: tokens !== null,
      last_synced_at: tokens?.last_synced_at || null,
      isExpired,
    };
  }
}
