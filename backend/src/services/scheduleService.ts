import { supabase, getAuthenticatedSupabase } from '../config/supabase.js';
import type { Schedule, ProjectSchedule, TaskSchedule } from '../types/database.js';
import type {
  CreateProjectScheduleInput,
  UpdateProjectScheduleInput,
  CreateTaskScheduleInput,
  UpdateTaskScheduleInput,
} from '../types/database.js';

export class ScheduleService {
  private getClient(token?: string) {
    return token ? getAuthenticatedSupabase(token) : supabase;
  }

  private isActive(
    effectiveFrom: Date,
    effectiveTo: Date | null,
    now: Date
  ): boolean {
    return effectiveFrom <= now && (effectiveTo === null || effectiveTo > now);
  }

  // ─── Project Schedule ───────────────────────────────────────────────────────

  // Get the active project schedule for a project
  async getProjectSchedule(
    projectId: string,
    token?: string
  ): Promise<ProjectSchedule | null> {
    const client = this.getClient(token);
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('project_schedules')
      .select('*')
      .eq('project_id', projectId)
      .lte('effective_from', now)
      .or(`effective_to.is.null,effective_to.gt.${now}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No project schedule found
      }
      throw new Error(`Failed to fetch project schedule: ${error.message}`);
    }

    return data
      ? {
          ...data,
          effective_from: new Date(data.effective_from),
          effective_to: data.effective_to ? new Date(data.effective_to) : null,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        }
      : null;
  }

  // Create a project schedule
  async createProjectSchedule(
    input: CreateProjectScheduleInput,
    token?: string
  ): Promise<ProjectSchedule> {
    const client = this.getClient(token);
    const { data, error } = await client
      .from('project_schedules')
      .insert([
        {
          project_id: input.project_id,
          schedule_id: input.schedule_id,
          effective_from: new Date(input.effective_from).toISOString(),
          effective_to: input.effective_to
            ? new Date(input.effective_to).toISOString()
            : null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project schedule: ${error.message}`);
    }

    return {
      ...data,
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Update a project schedule
  async updateProjectSchedule(
    id: string,
    projectId: string,
    input: UpdateProjectScheduleInput,
    token?: string
  ): Promise<ProjectSchedule> {
    const client = this.getClient(token);
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.schedule_id !== undefined) updateData.schedule_id = input.schedule_id;
    if (input.effective_from !== undefined)
      updateData.effective_from = new Date(input.effective_from).toISOString();
    if (input.effective_to !== undefined)
      updateData.effective_to = input.effective_to
        ? new Date(input.effective_to).toISOString()
        : null;

    const { data, error } = await client
      .from('project_schedules')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project schedule: ${error.message}`);
    }

    return {
      ...data,
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Delete a project schedule
  async deleteProjectSchedule(
    id: string,
    projectId: string,
    token?: string
  ): Promise<void> {
    const client = this.getClient(token);
    const { error } = await client
      .from('project_schedules')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to delete project schedule: ${error.message}`);
    }
  }

  // ─── Task Schedule ──────────────────────────────────────────────────────────

  // Get the active task schedule for a task
  async getTaskSchedule(
    taskId: string,
    token?: string
  ): Promise<TaskSchedule | null> {
    const client = this.getClient(token);
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('task_schedules')
      .select('*')
      .eq('task_id', taskId)
      .lte('effective_from', now)
      .or(`effective_to.is.null,effective_to.gt.${now}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No task schedule found
      }
      throw new Error(`Failed to fetch task schedule: ${error.message}`);
    }

    return data
      ? {
          ...data,
          effective_from: new Date(data.effective_from),
          effective_to: data.effective_to ? new Date(data.effective_to) : null,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        }
      : null;
  }

  // Create a task schedule
  async createTaskSchedule(
    input: CreateTaskScheduleInput,
    token?: string
  ): Promise<TaskSchedule> {
    const client = this.getClient(token);
    const { data, error } = await client
      .from('task_schedules')
      .insert([
        {
          task_id: input.task_id,
          schedule_id: input.schedule_id,
          effective_from: new Date(input.effective_from).toISOString(),
          effective_to: input.effective_to
            ? new Date(input.effective_to).toISOString()
            : null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task schedule: ${error.message}`);
    }

    return {
      ...data,
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Update a task schedule
  async updateTaskSchedule(
    id: string,
    taskId: string,
    input: UpdateTaskScheduleInput,
    token?: string
  ): Promise<TaskSchedule> {
    const client = this.getClient(token);
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.schedule_id !== undefined) updateData.schedule_id = input.schedule_id;
    if (input.effective_from !== undefined)
      updateData.effective_from = new Date(input.effective_from).toISOString();
    if (input.effective_to !== undefined)
      updateData.effective_to = input.effective_to
        ? new Date(input.effective_to).toISOString()
        : null;

    const { data, error } = await client
      .from('task_schedules')
      .update(updateData)
      .eq('id', id)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task schedule: ${error.message}`);
    }

    return {
      ...data,
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Delete a task schedule
  async deleteTaskSchedule(
    id: string,
    taskId: string,
    token?: string
  ): Promise<void> {
    const client = this.getClient(token);
    const { error } = await client
      .from('task_schedules')
      .delete()
      .eq('id', id)
      .eq('task_id', taskId);

    if (error) {
      throw new Error(`Failed to delete task schedule: ${error.message}`);
    }
  }

  // ─── Effective Schedule Resolution (Cascading) ──────────────────────────────

  /**
   * Resolve the effective schedule for a task using cascading resolution:
   * 1. Task schedule (if active)
   * 2. Project schedule (if active)
   * 3. User's default/active schedule
   * Throws if no schedule is found at any level.
   */
  async getEffectiveSchedule(
    taskId: string,
    token?: string
  ): Promise<Schedule> {
    const client = this.getClient(token);

    // 1. Fetch the task to get project_id and user_id
    const { data: task, error: taskError } = await client
      .from('tasks')
      .select('id, project_id, user_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Check for an active task schedule
    const { data: taskScheduleRow } = await client
      .from('task_schedules')
      .select('schedule_id, effective_from, effective_to')
      .eq('task_id', taskId)
      .lte('effective_from', nowIso)
      .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (taskScheduleRow) {
      const schedule = await this.fetchScheduleById(
        taskScheduleRow.schedule_id,
        client
      );
      if (schedule) return schedule;
    }

    // 3. Check for an active project schedule
    if (task.project_id) {
      const { data: projectScheduleRow } = await client
        .from('project_schedules')
        .select('schedule_id, effective_from, effective_to')
        .eq('project_id', task.project_id)
        .lte('effective_from', nowIso)
        .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (projectScheduleRow) {
        const schedule = await this.fetchScheduleById(
          projectScheduleRow.schedule_id,
          client
        );
        if (schedule) return schedule;
      }
    }

    // 4. Fall back to the user's default schedule
    const { data: userSchedule } = await client
      .from('schedules')
      .select('*')
      .eq('user_id', task.user_id)
      .eq('is_default', true)
      .single();

    if (userSchedule) {
      return {
        ...userSchedule,
        created_at: new Date(userSchedule.created_at),
        updated_at: new Date(userSchedule.updated_at),
      };
    }

    throw new Error(`No active schedule found for task ${taskId}`);
  }

  private async fetchScheduleById(
    scheduleId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any
  ): Promise<Schedule | null> {
    const { data, error } = await client
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}
