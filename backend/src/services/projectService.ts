import { serviceRoleSupabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/database.js';
import type { Project } from '../types/database.js';

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

export class ProjectService {
  // Create a new project
  async createProject(
    input: CreateProjectInput,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project> {
    const { data, error } = await client
      .from('projects')
      .insert([
        {
          name: input.name,
          description: input.description,
          deadline: input.deadline ? normalizeToMidnight(input.deadline) : null,
          status: input.status || 'not-started',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return data;
  }

  // Get all projects
  async getAllProjects(
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project[]> {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data || [];
  }

  // Get project by ID
  async getProjectById(
    id: string,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project | null> {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Project not found
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }

  // Update project
  async updateProject(
    id: string,
    input: UpdateProjectInput,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project> {
    const updateData: {
      updated_at: string;
      name?: string;
      description?: string;
      deadline?: string | null;
      status?: 'not-started' | 'in-progress' | 'completed';
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.deadline !== undefined)
      updateData.deadline = input.deadline
        ? normalizeToMidnight(input.deadline)
        : null;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await client
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data;
  }

  // Delete project
  async deleteProject(
    id: string,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<boolean> {
    const { error } = await client.from('projects').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }

    return true;
  }

  // Get projects by status
  async getProjectsByStatus(
    status: 'not-started' | 'in-progress' | 'completed',
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project[]> {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects by status: ${error.message}`);
    }

    return data || [];
  }
}
