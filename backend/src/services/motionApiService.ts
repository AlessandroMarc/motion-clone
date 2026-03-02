/**
 * Motion API client.
 * Handles all HTTP communication with https://api.usemotion.com/v1,
 * including cursor-based pagination and outgoing rate-limit compliance.
 *
 * Rate limits (from MIGRATION_DOCS.md):
 *   - Individual tier: 12 requests per minute
 *   - Team tier:      120 requests per minute
 *
 * This client defaults to the individual limit (12 req/min) and inserts a
 * minimum delay between successive HTTP calls to stay within quota.
 */
import type {
  MotionUser,
  MotionWorkspace,
  MotionSchedule,
  MotionProject,
  MotionTask,
  MotionRecurringTask,
  MotionPaginatedResponse,
} from '../types/motion.js';

const MOTION_API_BASE = 'https://api.usemotion.com/v1';

/**
 * Minimum gap between consecutive Motion API requests (ms).
 * 12 req/min  →  60 000 ms / 12 = 5 000 ms gap.
 * Using 5 100 ms adds a small safety margin.
 */
const MOTION_REQUEST_INTERVAL_MS = 5_100;

/** Returns a Promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Module-level timestamp of the last outgoing Motion API request.
 * Shared across ALL MotionApiService instances so that concurrent migrations
 * (e.g. two requests hitting the server simultaneously) respect the same
 * 12 req/min quota — not independent per-instance clocks.
 */
let globalLastMotionRequestTime = 0;

export class MotionApiService {
  private readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Motion API key is required');
    }
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Enforces the 12 req/min Motion API rate limit by waiting until at least
   * MOTION_REQUEST_INTERVAL_MS have elapsed since the previous request.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - globalLastMotionRequestTime;
    if (elapsed < MOTION_REQUEST_INTERVAL_MS) {
      await sleep(MOTION_REQUEST_INTERVAL_MS - elapsed);
    }
    globalLastMotionRequestTime = Date.now();
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    await this.throttle();

    const url = new URL(`${MOTION_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Motion API error ${response.status} for ${path}: ${body}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Iterate all pages of a list endpoint, returning every item.
   * The `itemsKey` is either "tasks", "projects", or "workspaces".
   */
  private async fetchAllPages<T>(
    path: string,
    itemsKey: 'tasks' | 'projects' | 'workspaces',
    fixedParams: Record<string, string> = {}
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { ...fixedParams };
      if (cursor) params['cursor'] = cursor;

      const page = await this.get<MotionPaginatedResponse<T>>(path, params);
      const items = (page[itemsKey] ?? []) as T[];
      results.push(...items);
      cursor = page.meta?.nextCursor;
    } while (cursor);

    return results;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** GET /users/me */
  async getMe(): Promise<MotionUser> {
    return this.get<MotionUser>('/users/me');
  }

  /** GET /workspaces — returns all pages */
  async listWorkspaces(): Promise<MotionWorkspace[]> {
    return this.fetchAllPages<MotionWorkspace>('/workspaces', 'workspaces');
  }

  /** GET /schedules */
  async listSchedules(): Promise<MotionSchedule[]> {
    return this.get<MotionSchedule[]>('/schedules');
  }

  /** GET /projects — returns all pages for a specific workspace */
  async listProjects(workspaceId: string): Promise<MotionProject[]> {
    return this.fetchAllPages<MotionProject>('/projects', 'projects', {
      workspaceId,
    });
  }

  /** GET /tasks — returns all pages (includeAllStatuses=true) for a workspace */
  async listTasks(workspaceId: string): Promise<MotionTask[]> {
    return this.fetchAllPages<MotionTask>('/tasks', 'tasks', {
      workspaceId,
      includeAllStatuses: 'true',
    });
  }

  /** GET /recurring-tasks — returns all pages for a specific workspace */
  async listRecurringTasks(workspaceId: string): Promise<MotionRecurringTask[]> {
    return this.fetchAllPages<MotionRecurringTask>(
      '/recurring-tasks',
      'tasks',
      { workspaceId }
    );
  }
}
