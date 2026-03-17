/**
 * Lightweight performance tracker for measuring operation durations.
 *
 * Logs timing with a [PERF] prefix.
 * Always logs when PERF_LOGGING=true env var is set.
 * Always logs when a phase exceeds its threshold.
 */

const PERF_LOGGING = process.env.PERF_LOGGING === 'true';

export class PerfTracker {
  private marks = new Map<string, number>();
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  /** Record the start time for a named phase. */
  start(phase: string): void {
    this.marks.set(phase, Date.now());
  }

  /**
   * Record the end time for a named phase and log the duration.
   * @param phase   Phase name (must match a prior start() call)
   * @param threshold  Log unconditionally when duration exceeds this (ms). Default 200ms.
   */
  end(phase: string, threshold = 200): number {
    const startTime = this.marks.get(phase);
    if (startTime === undefined) return 0;
    const duration = Date.now() - startTime;
    this.marks.delete(phase);

    if (PERF_LOGGING || duration > threshold) {
      const flag = duration > threshold ? ' ⚠️' : '';
      console.log(`[PERF] ${this.context} › ${phase}: ${duration}ms${flag}`);
    }

    return duration;
  }

  /**
   * Measure a single async operation and log its duration.
   */
  static async measure<T>(
    label: string,
    fn: () => Promise<T>,
    threshold = 200
  ): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      if (PERF_LOGGING || duration > threshold) {
        const flag = duration > threshold ? ' ⚠️' : '';
        console.log(`[PERF] ${label}: ${duration}ms${flag}`);
      }
    }
  }
}
