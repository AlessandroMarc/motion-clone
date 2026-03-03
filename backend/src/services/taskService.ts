import {
  getAuthenticatedSupabase,
  serviceRoleSupabase,
} from '../config/supabase.js';
import type { CreateTaskInput, UpdateTaskInput } from '../types/database.js';
import type { Task } from '../types/database.js';

/**
 * Normalize a date to midnight (00:00:00.000) in local time
 * Used for deadlines to ensure consistent date-only comparison
 */
function normalizeToMidnight(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

export class TaskService {
  private determineStatus(
    plannedDuration: number | null | undefined,
    actualDuration: number | null | undefined
  ): 'not-started' | 'in-progress' | 'completed' {
    const planned = plannedDuration ?? 0;
    const actual = actualDuration ?? 0;

    const normalizedPlanned = planned < 0 ? 0 : planned;
    const normalizedActual = actual < 0 ? 0 : actual;

    if (normalizedActual <= 0) {
      return 'not-started';
    }

    if (normalizedPlanned <= 0) {
      return 'completed';
    }

    if (normalizedActual >= normalizedPlanned) {
      return 'completed';
    }

    return 'in-progress';
  }

  // Create a new task
  async createTask(input: CreateTaskInput, authToken?: string): Promise<Task> {
    const startTime = Date.now();
    const rawPlanned = input.planned_duration_minutes;
    const normalizedPlanned = rawPlanned < 0 ? 0 : rawPlanned;
    const rawActual = input.actual_duration_minutes ?? 0;
    const normalizedActual = Math.min(
      Math.max(rawActual, 0),
      normalizedPlanned
    );

    const status = this.determineStatus(normalizedPlanned, normalizedActual);

    // Handle both Date objects and ISO strings (from JSON)
    // Normalize to midnight for date-only deadlines
    let dueDateString: string | null = null;
    if (input.due_date !== null && input.due_date !== undefined) {
      dueDateString = normalizeToMidnight(input.due_date);
    }

    // Resolve schedule_id: use provided value, then fall back to user's active/default schedule
    // Uses a single optimized query instead of 4 sequential queries
    const scheduleStart = Date.now();
    let scheduleId = input.schedule_id;

    if (scheduleId) {
      // Verify the provided schedule belongs to this user before using it
      const { data: ownedSchedule } = await serviceRoleSupabase
        .from('schedules')
        .select('id')
        .eq('id', scheduleId)
        .eq('user_id', input.user_id)
        .single();

      if (!ownedSchedule) {
        throw new Error(
          'Unauthorized: schedule does not belong to the current user'
        );
      }
    } else {
      // Fetch user's active schedule and all their schedules in parallel
      const [{ data: userSettings }, { data: schedules, error: queryError }] =
        await Promise.all([
          serviceRoleSupabase
            .from('user_settings')
            .select('active_schedule_id')
            .eq('user_id', input.user_id)
            .single(),
          serviceRoleSupabase
            .from('schedules')
            .select('id, is_default')
            .eq('user_id', input.user_id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: true }),
        ]);

      if (queryError) {
        throw new Error(`Failed to fetch schedule: ${queryError.message}`);
      }

      // Prefer the user's active schedule
      if (userSettings?.active_schedule_id) {
        const activeSchedule = schedules?.find(
          s => s.id === userSettings.active_schedule_id
        );
        if (activeSchedule) {
          scheduleId = activeSchedule.id;
        }
      }

      // Fall back to default or oldest schedule
      if (!scheduleId) {
        const fallback = schedules?.find(s => s.is_default) ?? schedules?.[0];
        if (fallback?.id) {
          scheduleId = fallback.id;
        }
      }

      if (!scheduleId) {
        // Create a default schedule for the user if none exists
        const { data: newSchedule, error: scheduleError } =
          await serviceRoleSupabase
            .from('schedules')
            .insert([
              {
                user_id: input.user_id,
                name: 'Default',
                working_hours_start: 9,
                working_hours_end: 22,
                is_default: true,
              },
            ])
            .select('id')
            .single();

        if (scheduleError || !newSchedule?.id) {
          throw new Error(
            `No schedule found for user and could not create one: ${
              scheduleError?.message ?? 'unknown insert error'
            }`
          );
        }
        scheduleId = newSchedule.id;
      }
    }
    const scheduleDuration = Date.now() - scheduleStart;
    if (scheduleDuration > 100) {
      console.warn(
        `[TaskService] Schedule resolution took ${scheduleDuration}ms (should be <100ms)`
      );
    }

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .insert([
        {
          title: input.title,
          description: input.description,
          due_date: dueDateString,
          priority: input.priority,
          status,
          dependencies: input.dependencies || [],
          blocked_by: input.blockedBy || [],
          project_id: input.project_id,
          planned_duration_minutes: normalizedPlanned,
          actual_duration_minutes: normalizedActual,
          user_id: input.user_id,
          schedule_id: scheduleId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    const totalDuration = Date.now() - startTime;
    if (totalDuration > 200) {
      console.warn(
        `[TaskService] Task creation took ${totalDuration}ms (schedule: ${scheduleDuration}ms)`
      );
    }

    return data;
  }

  // Get all tasks
  async getAllTasks(authToken?: string): Promise<Task[]> {
    const startTime = Date.now();
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    const taskCount = data?.length || 0;
    if (duration > 500 || taskCount > 100) {
      console.log(`[TaskService] Fetched ${taskCount} tasks in ${duration}ms`);
    }

    return data || [];
  }

  // Get task by ID
  async getTaskById(id: string, authToken?: string): Promise<Task | null> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Task not found
      }
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data;
  }

  // Update task
  async updateTask(
    id: string,
    input: UpdateTaskInput,
    authToken?: string
  ): Promise<Task> {
    const existingTask = await this.getTaskById(id, authToken);

    if (!existingTask) {
      throw new Error('Task not found');
    }

    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      due_date?: string | null;
      priority?: 'low' | 'medium' | 'high';
      status?: 'not-started' | 'in-progress' | 'completed';
      dependencies?: string[];
      blocked_by?: string[];
      schedule_id?: string | null;
      project_id?: string | null;
      planned_duration_minutes?: number;
      actual_duration_minutes?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.due_date !== undefined) {
      // Normalize to midnight for date-only deadlines
      if (input.due_date === null) {
        updateData.due_date = null;
      } else {
        updateData.due_date = normalizeToMidnight(input.due_date);
      }
    }
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dependencies !== undefined)
      updateData.dependencies = input.dependencies;
    if (input.blockedBy !== undefined) updateData.blocked_by = input.blockedBy;
    if (input.schedule_id !== undefined) {
      if (input.schedule_id !== null) {
        // Verify the provided schedule belongs to this task's owner
        const userId = input.user_id ?? existingTask.user_id;
        const { data: ownedSchedule } = await serviceRoleSupabase
          .from('schedules')
          .select('id')
          .eq('id', input.schedule_id)
          .eq('user_id', userId)
          .single();

        if (!ownedSchedule) {
          throw new Error(
            'Unauthorized: schedule does not belong to the current user'
          );
        }
      }
      updateData.schedule_id = input.schedule_id;
    }
    if (input.project_id !== undefined)
      updateData.project_id = input.project_id;

    const rawPlanned =
      input.planned_duration_minutes ?? existingTask.planned_duration_minutes;
    const normalizedPlanned = rawPlanned < 0 ? 0 : rawPlanned;

    if (input.planned_duration_minutes !== undefined) {
      updateData.planned_duration_minutes = normalizedPlanned;
    }

    const rawActual =
      input.actual_duration_minutes ??
      existingTask.actual_duration_minutes ??
      0;
    const normalizedActual = Math.min(
      Math.max(rawActual, 0),
      normalizedPlanned
    );

    updateData.actual_duration_minutes = normalizedActual;
    updateData.status = this.determineStatus(
      normalizedPlanned,
      normalizedActual
    );

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    // Propagate title change to linked calendar events
    if (updateData.title && updateData.title !== existingTask.title) {
      const { error: calendarError } = await client
        .from('calendar_events')
        .update({ title: updateData.title, updated_at: updateData.updated_at })
        .eq('linked_task_id', id);

      if (calendarError) {
        console.error(
          `Failed to propagate title change to calendar events: ${calendarError.message}`
        );
      }
    }

    return data;
  }

  // Delete task
  async deleteTask(id: string, authToken?: string): Promise<boolean> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { error } = await client.from('tasks').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return true;
  }

  // Get tasks by project ID
  async getTasksByProjectId(
    projectId: string,
    authToken?: string
  ): Promise<Task[]> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tasks by project: ${error.message}`);
    }

    return data || [];
  }

  // Get tasks by status
  async getTasksByStatus(
    status: 'not-started' | 'in-progress' | 'completed',
    authToken?: string
  ): Promise<Task[]> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tasks by status: ${error.message}`);
    }

    return data || [];
  }
}
