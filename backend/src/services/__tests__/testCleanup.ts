/**
 * Test cleanup utilities
 * Provides common cleanup functions for all tests to use
 */

/**
 * Clear all pending auto-schedule triggers
 * Call this in afterEach hooks to prevent Jest teardown errors
 */
export async function clearAutoScheduleTriggers(): Promise<void> {
  try {
    const { autoScheduleTriggerQueue } =
      await import('../autoScheduleTriggerQueue.js');
    if (autoScheduleTriggerQueue && autoScheduleTriggerQueue.cancelAll) {
      autoScheduleTriggerQueue.cancelAll();
    }
  } catch {
    // Silently ignore import errors
  }
}
