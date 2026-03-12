/**
 * AutoScheduleTriggerQueue — centralized trigger management for auto-scheduling.
 *
 * Responsibilities:
 *  1. Accept trigger requests from various services (task mutations, schedule changes, etc.)
 *  2. Debounce/batch triggers per user to prevent waterfalls
 *  3. Run auto-schedule asynchronously (fire-and-forget) after mutations complete
 *  4. Log errors without blocking the triggering operation
 *
 * Pattern: Services call trigger(userId, authToken) after mutations.
 * The queue ensures only one pending auto-schedule per user, even if multiple
 * triggers fire within the debounce window.
 */

interface PendingTrigger {
  userId: string;
  authToken: string;
  timer: ReturnType<typeof setTimeout>;
}

// Debounce window: wait this long for additional triggers before running
const DEBOUNCE_MS = 500;

// Module-scoped service instance (lazy initialization)
let autoScheduleServiceInstance: any = null;

async function getAutoScheduleService(): Promise<any> {
  if (!autoScheduleServiceInstance) {
    try {
      const module = await import('./autoScheduleService.js');
      autoScheduleServiceInstance = new module.AutoScheduleService();
    } catch (error) {
      console.error(
        '[AutoScheduleTrigger] Failed to load AutoScheduleService:',
        error
      );
      throw error;
    }
  }
  return autoScheduleServiceInstance;
}

class AutoScheduleTriggerQueueImpl {
  private pendingTriggers = new Map<string, PendingTrigger>();
  // Track in-flight synchronous runs to prevent duplicate triggers
  private runningSyncTriggers = new Set<string>();

  /**
   * Queue an auto-schedule trigger for the given user.
   * If another trigger is pending, this extends the debounce window.
   * The autoSchedule operation itself is fire-and-forget (non-blocking).
   *
   * @param userId User ID
   * @param authToken Auth token for API calls
   */
  trigger(userId: string, authToken: string): void {
    // Cancel existing timer if present
    const existing = this.pendingTriggers.get(userId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    // Schedule new debounced trigger
    const timer = setTimeout(() => {
      this.pendingTriggers.delete(userId);
      this.runAutoScheduleAsync(userId, authToken);
    }, DEBOUNCE_MS);

    this.pendingTriggers.set(userId, { userId, authToken, timer });
  }

  /**
   * Trigger auto-schedule and wait for completion (synchronous mode).
   * Used when the caller needs to ensure scheduling is complete before proceeding.
   * Debounces rapid calls but waits for the scheduled run to finish.
   *
   * @param userId User ID
   * @param authToken Auth token for API calls
   * @returns Promise that resolves when auto-schedule completes
   */
  async triggerAndWait(userId: string, authToken: string): Promise<void> {
    // If a sync run is already in flight for this user, wait for it
    const syncKey = `sync-${userId}`;
    if (this.runningSyncTriggers.has(syncKey)) {
      // Already running, just return (caller will see the result eventually)
      return;
    }

    // Cancel any pending async trigger for this user
    const existing = this.pendingTriggers.get(userId);
    if (existing) {
      clearTimeout(existing.timer);
      this.pendingTriggers.delete(userId);
    }

    // Mark as running and execute
    this.runningSyncTriggers.add(syncKey);
    try {
      const service = await getAutoScheduleService();
      await service.run(userId, authToken);
    } finally {
      this.runningSyncTriggers.delete(syncKey);
    }
  }

  /**
   * Run auto-schedule asynchronously without blocking the caller.
   * Errors are logged but not thrown.
   */
  private runAutoScheduleAsync(userId: string, authToken: string): void {
    // Fire-and-forget: don't await at call site, but handle errors internally
    getAutoScheduleService()
      .then((service: any) => service.run(userId, authToken))
      .then((result: any) => {
        console.log(
          `[AutoScheduleTrigger] Auto-schedule run complete for user ${userId}:`,
          {
            unchanged: result.unchanged,
            eventsCreated: result.eventsCreated,
            eventsDeleted: result.eventsDeleted,
            violations: result.violations,
          }
        );
      })
      .catch((error: any) => {
        console.error(
          `[AutoScheduleTrigger] Auto-schedule run failed for user ${userId}:`,
          error instanceof Error ? error.message : error
        );
      });
  }

  /**
   * Cancel any pending trigger for the given user.
   * Useful for cleanup.
   */
  cancel(userId: string): void {
    const pending = this.pendingTriggers.get(userId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingTriggers.delete(userId);
    }
  }

  /**
   * Cancel all pending triggers.
   * Useful for test cleanup.
   */
  cancelAll(): void {
    for (const [, pending] of this.pendingTriggers) {
      clearTimeout(pending.timer);
    }
    this.pendingTriggers.clear();
  }
}

// Singleton instance
let instance: AutoScheduleTriggerQueueImpl | null = null;

function getInstance(): AutoScheduleTriggerQueueImpl {
  if (!instance) {
    instance = new AutoScheduleTriggerQueueImpl();
  }
  return instance;
}

export const autoScheduleTriggerQueue = getInstance();
