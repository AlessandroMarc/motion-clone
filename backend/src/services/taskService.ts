import { supabase } from '../config/supabase.js';
import type { CreateTaskInput, UpdateTaskInput } from '../types/database.js';
import type { Task } from '@shared/types.js';

export class TaskService {
  // Create a new task
  async createTask(input: CreateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: input.title,
          description: input.description,
          due_date: input.due_date?.toISOString(),
          priority: input.priority,
          status: input.status || 'pending',
          dependencies: input.dependencies || [],
          project_id: input.project_id,
          planned_duration_minutes: input.planned_duration_minutes,
          actual_duration_minutes: input.actual_duration_minutes ?? 0,
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
    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      due_date?: string | null;
      priority?: 'low' | 'medium' | 'high';
      status?: 'pending' | 'in-progress' | 'completed';
      dependencies?: string[];
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
    if (input.status !== undefined) updateData.status = input.status;
    if (input.dependencies !== undefined)
      updateData.dependencies = input.dependencies;
    if (input.project_id !== undefined)
      updateData.project_id = input.project_id;
    if (input.planned_duration_minutes !== undefined)
      updateData.planned_duration_minutes = input.planned_duration_minutes;
    if (input.actual_duration_minutes !== undefined)
      updateData.actual_duration_minutes = input.actual_duration_minutes;

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
