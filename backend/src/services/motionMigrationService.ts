/**
 * Motion → Nexto migration service.
 *
 * Orchestrates pulling data from the Motion API and inserting it into the
 * Nexto Supabase database as projects and tasks.
 *
 * Migration order:
 *   1. Get the authenticated Motion user.
 *   2. Get all workspaces.
 *   3. For each workspace: get schedules, projects, tasks, and recurring tasks.
 *   4. Map and persist projects first, then tasks (regular + recurring instances).
 */
import { MotionApiService } from './motionApiService.js';
import { ProjectService } from './projectService.js';
import { TaskService } from './taskService.js';
import { getAuthenticatedSupabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MotionTask,
  MotionRecurringTask,
  MotionProject,
  MotionSchedule,
  MotionPriority,
} from '../types/motion.js';
import type { CreateProjectInput, CreateTaskInput } from '../types/database.js';

// ── Priority mapping ─────────────────────────────────────────────────────────

/**
 * Maps Motion priorities to Nexto priorities.
 * Motion: ASAP | HIGH | MEDIUM | LOW
 * Nexto:  high | high | medium | low
 */
export function mapPriority(
  motionPriority: MotionPriority
): 'low' | 'medium' | 'high' {
  switch (motionPriority) {
    case 'ASAP':
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
    default:
      return 'low';
  }
}

/**
 * Maps a Motion task duration to Nexto's planned_duration_minutes (number).
 * Motion duration can be a number (minutes), "NONE", or "REMINDER".
 */
export function mapDuration(
  duration: number | 'NONE' | 'REMINDER' | undefined
): number {
  if (typeof duration === 'number' && duration > 0) {
    return duration;
  }
  return 0;
}

/**
 * Maps a Motion task to a Nexto CreateTaskInput.
 * The `nextoProjectId` should already be the Nexto project id (not Motion's).
 */
export function mapMotionTaskToCreateInput(
  task: MotionTask | MotionRecurringTask,
  userId: string,
  nextoProjectId?: string,
  isRecurring = false
): CreateTaskInput {
  // MotionTask has `completed`; MotionRecurringTask does not
  const motionTask = task as MotionTask;

  const title = isRecurring
    ? `[Recurring] ${task.name}`
    : task.name;

  const dueDate =
    'dueDate' in motionTask && motionTask.dueDate
      ? new Date(motionTask.dueDate)
      : null;

  const priority = mapPriority(task.priority);
  const plannedDuration = mapDuration(task.duration);
  const description =
    'description' in motionTask ? motionTask.description : undefined;

  const input: CreateTaskInput = {
    title,
    due_date: dueDate,
    priority,
    planned_duration_minutes: plannedDuration,
    user_id: userId,
  };

  if (description !== undefined) input.description = description;
  if (nextoProjectId !== undefined) input.project_id = nextoProjectId;

  return input;
}

// ── Result types ─────────────────────────────────────────────────────────────

export interface MigrationWorkspaceSummary {
  motionWorkspaceId: string;
  motionWorkspaceName: string;
  projectsImported: number;
  tasksImported: number;
  recurringTasksImported: number;
  errors: string[];
}

export interface MigrationResult {
  userId: string;
  schedulesFound: number;
  workspaces: MigrationWorkspaceSummary[];
  totalProjectsImported: number;
  totalTasksImported: number;
  totalRecurringTasksImported: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class MotionMigrationService {
  private readonly motionApi: MotionApiService;
  private readonly projectService: ProjectService;
  private readonly taskService: TaskService;

  constructor(motionApiKey: string) {
    this.motionApi = new MotionApiService(motionApiKey);
    this.projectService = new ProjectService();
    this.taskService = new TaskService();
  }

  /**
   * Run the full migration for the authenticated Motion user.
   *
   * @param nextoUserId  - The Nexto (Supabase) user id to assign created records to.
   * @param nextoAuthToken - The caller's Supabase JWT (used to create records
   *                         under the correct user context, respecting RLS).
   */
  async migrate(
    nextoUserId: string,
    nextoAuthToken: string
  ): Promise<MigrationResult> {
    const supabaseClient: SupabaseClient =
      getAuthenticatedSupabase(nextoAuthToken);
    // 1. Verify Motion credentials and get user info
    const motionUser = await this.motionApi.getMe();

    // 2. Fetch schedules (informational – stored in result summary)
    const schedules: MotionSchedule[] = await this.motionApi.listSchedules();

    // 3. Fetch workspaces
    const workspaces = await this.motionApi.listWorkspaces();

    const result: MigrationResult = {
      userId: motionUser.id,
      schedulesFound: schedules.length,
      workspaces: [],
      totalProjectsImported: 0,
      totalTasksImported: 0,
      totalRecurringTasksImported: 0,
    };

    // 4. Process each workspace
    for (const workspace of workspaces) {
      const summary = await this.migrateWorkspace(
        workspace.id,
        workspace.name,
        nextoUserId,
        nextoAuthToken,
        supabaseClient
      );
      result.workspaces.push(summary);
      result.totalProjectsImported += summary.projectsImported;
      result.totalTasksImported += summary.tasksImported;
      result.totalRecurringTasksImported += summary.recurringTasksImported;
    }

    return result;
  }

  private async migrateWorkspace(
    workspaceId: string,
    workspaceName: string,
    nextoUserId: string,
    nextoAuthToken: string,
    supabaseClient: SupabaseClient
  ): Promise<MigrationWorkspaceSummary> {
    const summary: MigrationWorkspaceSummary = {
      motionWorkspaceId: workspaceId,
      motionWorkspaceName: workspaceName,
      projectsImported: 0,
      tasksImported: 0,
      recurringTasksImported: 0,
      errors: [],
    };

    // ── Projects ────────────────────────────────────────────────────────────
    let motionProjects: MotionProject[] = [];
    try {
      motionProjects = await this.motionApi.listProjects(workspaceId);
    } catch (err) {
      summary.errors.push(
        `Failed to fetch projects for workspace ${workspaceId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Build a map from Motion project id → Nexto project id
    const projectIdMap = new Map<string, string>();

    for (const mp of motionProjects) {
      try {
        const input: CreateProjectInput = {
          name: mp.name,
          status: mp.status?.isResolvedStatus
            ? 'completed'
            : mp.status?.isDefaultStatus
              ? 'not-started'
              : 'in-progress',
          user_id: nextoUserId,
        };
        if (mp.description) input.description = mp.description;
        const created = await this.projectService.createProject(
          input,
          supabaseClient
        );
        projectIdMap.set(mp.id, created.id);
        summary.projectsImported++;
      } catch (err) {
        summary.errors.push(
          `Failed to import project "${mp.name}" (${mp.id}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // ── Regular tasks ────────────────────────────────────────────────────────
    let motionTasks: MotionTask[] = [];
    try {
      motionTasks = await this.motionApi.listTasks(workspaceId);
    } catch (err) {
      summary.errors.push(
        `Failed to fetch tasks for workspace ${workspaceId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    for (const mt of motionTasks) {
      try {
        const nextoProjectId = mt.project?.id
          ? projectIdMap.get(mt.project.id)
          : undefined;

        const input = mapMotionTaskToCreateInput(
          mt,
          nextoUserId,
          nextoProjectId
        );
        await this.taskService.createTask(input, nextoAuthToken);
        summary.tasksImported++;
      } catch (err) {
        summary.errors.push(
          `Failed to import task "${mt.name}" (${mt.id}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // ── Recurring tasks ──────────────────────────────────────────────────────
    let motionRecurring: MotionRecurringTask[] = [];
    try {
      motionRecurring = await this.motionApi.listRecurringTasks(workspaceId);
    } catch (err) {
      summary.errors.push(
        `Failed to fetch recurring tasks for workspace ${workspaceId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    for (const rt of motionRecurring) {
      try {
        const nextoProjectId = rt.project?.id
          ? projectIdMap.get(rt.project.id)
          : undefined;

        const input = mapMotionTaskToCreateInput(
          rt,
          nextoUserId,
          nextoProjectId,
          true
        );
        await this.taskService.createTask(input, nextoAuthToken);
        summary.recurringTasksImported++;
      } catch (err) {
        summary.errors.push(
          `Failed to import recurring task "${rt.name}" (${rt.id}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return summary;
  }
}
