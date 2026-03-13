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

import type { AutoScheduleService } from './autoScheduleService.js';

interface PendingTrigger {
  userId: string;
  authToken: string;
  timer: ReturnType<typeof setTimeout>;
}

// Debounce window: wait this long for additional triggers before running
const DEBOUNCE_MS = 500;

// Module-scoped service instance (lazy initialization)
let autoScheduleServiceInstance: AutoScheduleService | null = null;

async function getAutoScheduleService(): Promise<AutoScheduleService> {
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
  return autoScheduleServiceInstance!;
}

class AutoScheduleTriggerQueueImpl {
  private pendingTriggers = new Map<string, PendingTrigger>();
  // Track in-flight synchronous runs and their promises
  private runningSyncPromises = new Map<string, Promise<void>>();
  // Track if a rerun is needed because a mutation occurred during a run
  private needsRerun = new Set<string>();

  /**
   * Queue an auto-schedule trigger for the given user.
   * If another trigger is pending, this extends the debounce window.
   * The autoSchedule operation itself is fire-and-forget (non-blocking).
   *
   * @param userId User ID
   * @param authToken Auth token for API calls
   */
  trigger(userId: string, authToken: string): void {
    // If a sync run is already in flight, mark that we need a rerun after it finishes
    if (this.runningSyncPromises.has(userId)) {
      this.needsRerun.add(userId);
      return;
    }

    // Cancel existing timer if present
    const existing = this.pendingTriggers.get(userId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    // Schedule new debounced trigger
    const timer = setTimeout(() => {
      this.pendingTriggers.delete(userId);
      // Fire-and-forget: use the internal run logic but don't await it
      this.executeRun(userId, authToken).catch(error => {
        console.error(
          `[AutoScheduleTrigger] Async run failed for user ${userId}:`,
          error instanceof Error ? error.message : error
        );
      });
    }, DEBOUNCE_MS);

    this.pendingTriggers.set(userId, { userId, authToken, timer });
  }

  /**
   * Internal runner that handles promise tracking and reruns.
   */
  private async executeRun(userId: string, authToken: string): Promise<void> {
    // Check if a run is already in flight
    const existingPromise = this.runningSyncPromises.get(userId);
    if (existingPromise) {
      this.needsRerun.add(userId);
      return existingPromise;
    }

    // Create a recursive runner to handle reruns
    const run = async (): Promise<void> => {
      try {
        const service = await getAutoScheduleService();
        const result = await service.run(userId, authToken);
        console.log(
          `[AutoScheduleTrigger] Auto-schedule run complete for user ${userId}:`,
          {
            unchanged: result.unchanged,
            eventsCreated: result.eventsCreated,
            eventsDeleted: result.eventsDeleted,
            violations: result.violations,
          }
        );
      } finally {
        // If a rerun was requested while this run was active, start another one
        if (this.needsRerun.has(userId)) {
          this.needsRerun.delete(userId);
          await run();
        }
      }
    };

    // Mark as running and execute
    const promise = run().finally(() => {
      this.runningSyncPromises.delete(userId);
      this.needsRerun.delete(userId);
    });

    this.runningSyncPromises.set(userId, promise);
    await promise;
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
    // Cancel any pending async trigger for this user
    const existing = this.pendingTriggers.get(userId);
    if (existing) {
      clearTimeout(existing.timer);
      this.pendingTriggers.delete(userId);
    }

    // Join or start a run and wait for it
    await this.executeRun(userId, authToken);
  }

  /**
   * Run auto-schedule asynchronously without blocking the caller.
   * Errors are logged but not thrown.
   *
   * @deprecated Internal runner 'executeRun' is used instead.
   */
  private runAutoScheduleAsync(userId: string, authToken: string): void {
    this.executeRun(userId, authToken).catch(error => {
      console.error(
        `[AutoScheduleTrigger] runAutoScheduleAsync failed for user ${userId}:`,
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
