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
  MotionWorkspace,
  MotionPriority,
} from '../types/motion.js';
import type { CreateProjectInput, CreateTaskInput } from '../types/database.js';

interface MotionWorkspaceSnapshot {
  workspace: MotionWorkspace;
  projects: MotionProject[];
  tasks: MotionTask[];
  recurringTasks: MotionRecurringTask[];
  fetchErrors: string[];
}

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

function normalizeRecurrencePattern(
  value: unknown
): CreateTaskInput['recurrence_pattern'] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.includes('day')) return 'daily';
  if (normalized.includes('week')) return 'weekly';
  if (normalized.includes('month')) return 'monthly';
  return undefined;
}

function getRecurrenceInterval(task: MotionRecurringTask): number | undefined {
  const interval = (
    task as MotionRecurringTask & { recurrenceInterval?: unknown }
  ).recurrenceInterval;
  if (
    typeof interval === 'number' &&
    Number.isInteger(interval) &&
    interval > 0
  ) {
    return interval;
  }
  return undefined;
}

function getRecurrenceStartDate(
  task: MotionRecurringTask
): Date | null | undefined {
  const recurrenceStartDate = (
    task as MotionRecurringTask & { recurrenceStartDate?: unknown }
  ).recurrenceStartDate;
  if (typeof recurrenceStartDate === 'string' && recurrenceStartDate) {
    return new Date(recurrenceStartDate);
  }
  return undefined;
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
  const title = isRecurring ? `[Recurring] ${task.name}` : task.name;

  // MotionTask has `dueDate` and `description`; MotionRecurringTask does not
  const dueDate =
    'dueDate' in task && task.dueDate ? new Date(task.dueDate) : null;

  const priority = mapPriority(task.priority);
  const plannedDuration = mapDuration(task.duration);
  const description = 'description' in task ? task.description : undefined;

  const input: CreateTaskInput = {
    title,
    due_date: dueDate,
    priority,
    planned_duration_minutes: plannedDuration,
    user_id: userId,
  };

  if (isRecurring) {
    const recurringTask = task as MotionRecurringTask;
    const recurrencePattern =
      normalizeRecurrencePattern(recurringTask.frequency) ?? 'weekly';

    input.is_recurring = true;
    input.recurrence_pattern = recurrencePattern;

    const recurrenceInterval = getRecurrenceInterval(recurringTask);
    input.recurrence_interval = recurrenceInterval ?? 1;

    const recurrenceStartDate = getRecurrenceStartDate(recurringTask);
    if (recurrenceStartDate !== undefined) {
      input.recurrence_start_date = recurrenceStartDate;
    }
  }

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

    // ── Phase 1: Fetch data from Motion (no disk I/O) ────────────────────────
    const motionUser = await this.motionApi.getMe();
    const schedules: MotionSchedule[] = await this.motionApi.listSchedules();
    const workspaces = await this.motionApi.listWorkspaces();

    const workspaceSnapshots: MotionWorkspaceSnapshot[] = [];
    for (const workspace of workspaces) {
      const fetchErrors: string[] = [];
      let projects: MotionProject[] = [];
      let tasks: MotionTask[] = [];
      let recurringTasks: MotionRecurringTask[] = [];

      try {
        projects = await this.motionApi.listProjects(workspace.id);
      } catch (err) {
        fetchErrors.push(
          `Failed to fetch projects: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      try {
        tasks = await this.motionApi.listTasks(workspace.id);
      } catch (err) {
        fetchErrors.push(
          `Failed to fetch tasks: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      try {
        recurringTasks = await this.motionApi.listRecurringTasks(workspace.id);
      } catch (err) {
        fetchErrors.push(
          `Failed to fetch recurring tasks: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      workspaceSnapshots.push({
        workspace,
        projects,
        tasks,
        recurringTasks,
        fetchErrors,
      });
    }

    // ── Phase 2: Persist into Nexto ──────────────────────────────────────────
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
    {
      workspace,
      projects: motionProjects,
      tasks: motionTasks,
      recurringTasks: motionRecurring,
      fetchErrors,
    }: MotionWorkspaceSnapshot,
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
      // Seed with any errors that occurred during data fetching
      errors: [...fetchErrors],
    };

    // ── Projects ────────────────────────────────────────────────────────────
    // Build a map from Motion project id → Nexto project id
    const projectIdMap = new Map<string, string>();

    for (const mp of motionProjects) {
      try {
        const projectStatus: CreateProjectInput['status'] = !mp.status
          ? 'not-started'
          : mp.status.isResolvedStatus
            ? 'completed'
            : mp.status.isDefaultStatus
              ? 'not-started'
              : 'in-progress';
        const input: CreateProjectInput = {
          name: mp.name,
          status: projectStatus,
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
