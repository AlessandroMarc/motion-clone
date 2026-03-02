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
import path from 'path';
import { fileURLToPath } from 'url';
import { saveMotionSnapshot } from '../../export-motion-data.js';
import type { MotionWorkspaceSnapshot } from '../../export-motion-data.js';
import { ProjectService } from './projectService.js';
import { TaskService } from './taskService.js';
import { getAuthenticatedSupabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MotionTask,
  MotionRecurringTask,
  MotionPriority,
} from '../types/motion.js';
import type { CreateProjectInput, CreateTaskInput } from '../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  private readonly motionApiKey: string;
  private readonly projectService: ProjectService;
  private readonly taskService: TaskService;

  constructor(motionApiKey: string) {
    this.motionApiKey = motionApiKey;
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

    // ── Phase 1: Fetch all data from Motion + save snapshot to JSON ──────────
    const snapshotDir = path.join(__dirname, '../../../');
    const snapshot = await saveMotionSnapshot(this.motionApiKey, snapshotDir);
    const { user: motionUser, schedules, workspaces: workspaceSnapshots } = snapshot;

    // ── Phase 2: Import snapshot into Nexto ──────────────────────────────────
    const result: MigrationResult = {
      userId: motionUser.id,
      schedulesFound: schedules.length,
      workspaces: [],
      totalProjectsImported: 0,
      totalTasksImported: 0,
      totalRecurringTasksImported: 0,
    };

    for (const snap of workspaceSnapshots) {
      const summary = await this.importWorkspace(
        snap,
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

  private async importWorkspace(
    { workspace, projects: motionProjects, tasks: motionTasks, recurringTasks: motionRecurring }: MotionWorkspaceSnapshot,
    nextoUserId: string,
    nextoAuthToken: string,
    supabaseClient: SupabaseClient
  ): Promise<MigrationWorkspaceSummary> {
    const summary: MigrationWorkspaceSummary = {
      motionWorkspaceId: workspace.id,
      motionWorkspaceName: workspace.name,
      projectsImported: 0,
      tasksImported: 0,
      recurringTasksImported: 0,
      errors: [],
    };

    // ── Projects ────────────────────────────────────────────────────────────
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
