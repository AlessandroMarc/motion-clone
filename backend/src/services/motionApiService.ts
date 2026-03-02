/**
 * Motion API client.
 * Handles all HTTP communication with https://api.usemotion.com/v1,
 * including cursor-based pagination and basic rate-limit awareness.
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

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
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
