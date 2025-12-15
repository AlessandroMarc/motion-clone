import { supabase } from '../config/supabase.js';
import type { CreateTaskInput, UpdateTaskInput } from '../types/database.js';
import type { Task } from '@shared/types.js';

export class TaskService {
  private determineStatus(
    plannedDuration: number | null | undefined,
    actualDuration: number | null | undefined
  ): 'pending' | 'in-progress' | 'completed' {
    const planned = plannedDuration ?? 0;
    const actual = actualDuration ?? 0;

    const normalizedPlanned = planned < 0 ? 0 : planned;
    const normalizedActual = actual < 0 ? 0 : actual;

    if (normalizedActual <= 0) {
      return 'pending';
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
  async createTask(input: CreateTaskInput): Promise<Task> {
    const rawPlanned = input.planned_duration_minutes;
    const normalizedPlanned = rawPlanned < 0 ? 0 : rawPlanned;
    const rawActual = input.actual_duration_minutes ?? 0;
    const normalizedActual = Math.min(
      Math.max(rawActual, 0),
      normalizedPlanned
    );

    const status = this.determineStatus(normalizedPlanned, normalizedActual);

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: input.title,
          description: input.description,
          due_date: input.due_date?.toISOString(),
          priority: input.priority,
          status,
          dependencies: input.dependencies || [],
          blocked_by: input.blockedBy || [],
          project_id: input.project_id,
          planned_duration_minutes: normalizedPlanned,
          actual_duration_minutes: normalizedActual,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return data;
  }

  // Get all tasks
  async getAllTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return data || [];
  }

  // Get task by ID
  async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
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
  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const existingTask = await this.getTaskById(id);

    if (!existingTask) {
      throw new Error('Task not found');
    }

    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      due_date?: string | null;
      priority?: 'low' | 'medium' | 'high';
      status?: 'pending' | 'in-progress' | 'completed';
      dependencies?: string[];
      blocked_by?: string[];
      project_id?: string | null;
      planned_duration_minutes?: number;
      actual_duration_minutes?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.due_date !== undefined)
      updateData.due_date = input.due_date?.toISOString() ?? null;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dependencies !== undefined)
      updateData.dependencies = input.dependencies;
    if (input.blockedBy !== undefined) updateData.blocked_by = input.blockedBy;
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

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return data;
  }

  // Delete task
  async deleteTask(id: string): Promise<boolean> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return true;
  }

  // Get tasks by project ID
  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    const { data, error } = await supabase
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
    status: 'pending' | 'in-progress' | 'completed'
  ): Promise<Task[]> {
    const { data, error } = await supabase
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
