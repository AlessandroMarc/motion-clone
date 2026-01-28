import * as cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { GoogleCalendarService } from './googleCalendarService.js';

const SYNC_INTERVAL = '*/15 * * * *'; // Every 15 minutes

export class SyncScheduler {
  private googleCalendarService: GoogleCalendarService;
  private task: ReturnType<typeof cron.schedule> | null = null;

  constructor() {
    this.googleCalendarService = new GoogleCalendarService();
  }

  /**
   * Start the sync scheduler
   */
  start(): void {
    if (this.task) {
      console.log('[SyncScheduler] Scheduler already running');
      return;
    }

    console.log('[SyncScheduler] Starting sync scheduler (every 15 minutes)');
    this.task = cron.schedule(SYNC_INTERVAL, async () => {
      await this.syncAllUsers();
    });
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[SyncScheduler] Sync scheduler stopped');
    }
  }

  /**
   * Sync Google Calendar events for all connected users
   */
  private async syncAllUsers(): Promise<void> {
    try {
      console.log('[SyncScheduler] Starting scheduled sync for all users');

      // Get all users with Google Calendar tokens
      const { data: tokens, error } = await supabase
        .from('google_calendar_tokens')
        .select('user_id');

      if (error) {
        console.error('[SyncScheduler] Failed to fetch users:', error);
        return;
      }

      if (!tokens || tokens.length === 0) {
        console.log('[SyncScheduler] No users with Google Calendar connected');
        return;
      }

      console.log(`[SyncScheduler] Found ${tokens.length} users to sync`);

      const results = await Promise.allSettled(
        tokens.map(async token => {
          try {
            const result =
              await this.googleCalendarService.syncEventsFromGoogle(
                token.user_id
              );
            return {
              userId: token.user_id,
              success: result.success,
              synced: result.synced,
              errors: result.errors,
            };
          } catch (error) {
            console.error(
              `[SyncScheduler] Error syncing user ${token.user_id}:`,
              error
            );
            return {
              userId: token.user_id,
              success: false,
              synced: 0,
              errors: [
                error instanceof Error ? error.message : 'Unknown error',
              ],
            };
          }
        })
      );

      const successful = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.length - successful;
      const totalSynced = results.reduce((sum, r) => {
        if (r.status === 'fulfilled') {
          return sum + r.value.synced;
        }
        return sum;
      }, 0);

      console.log(
        `[SyncScheduler] Sync completed: ${successful} successful, ${failed} failed, ${totalSynced} total events synced`
      );
    } catch (error) {
      console.error('[SyncScheduler] Fatal error in sync:', error);
    }
  }
}
