import { serviceRoleSupabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/database.js';
import type { Project } from '../types/database.js';
import { autoScheduleTriggerQueue } from './autoScheduleTriggerQueue.js';
import { normalizeToMidnight as normalizeToMidnightDate } from '../../../shared/dateUtils.js';

/**
 * Normalize a date to midnight ISO string.
 */
function normalizeToMidnight(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return normalizeToMidnightDate(dateObj).toISOString();
}

export class ProjectService {
  // Create a new project
  async createProject(
    input: CreateProjectInput,
    client: SupabaseClient = serviceRoleSupabase,
    authToken?: string
  ): Promise<Project> {
    const { data, error } = await client
      .from('projects')
      .insert([
        {
          name: input.name,
          description: input.description,
          deadline: input.deadline ? normalizeToMidnight(input.deadline) : null,
          schedule_id: input.schedule_id ?? null,
          status: input.status || 'not-started',
          user_id: input.user_id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Trigger auto-schedule asynchronously (fire-and-forget)
    if (authToken) {
      autoScheduleTriggerQueue.trigger(input.user_id, authToken);
    }

    return data;
  }

  // Get all projects
  async getAllProjects(
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Project[]> {
    const startTime = Date.now();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    const projectCount = data?.length || 0;
    if (duration > 300) {
      console.log(
        `[ProjectService] Fetched ${projectCount} projects in ${duration}ms`
      );
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
    client: SupabaseClient = serviceRoleSupabase,
    authToken?: string
  ): Promise<Project> {
    const updateData: {
      updated_at: string;
      name?: string;
      description?: string;
      deadline?: string | null;
      schedule_id?: string | null;
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
    if (input.schedule_id !== undefined)
      updateData.schedule_id = input.schedule_id;
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

    // Trigger auto-schedule if scheduling-relevant fields changed (deadline or schedule)
    if (authToken && (input.deadline !== undefined || input.schedule_id !== undefined)) {
      try {
        // We need the user_id for the trigger; it's in the returned data
        await autoScheduleTriggerQueue.triggerAndWait(data.user_id, authToken);
      } catch (err) {
        console.error(
          `[ProjectService] Auto-schedule trigger failed for user ${data.user_id}:`,
          err
        );
      }
    }

    return data;
  }

  // Delete project and all related tasks atomically
  // Uses a database transaction via stored procedure to prevent data loss
  // If any step fails, the entire operation is rolled back
  async deleteProject(
    id: string,
    client: SupabaseClient = serviceRoleSupabase,
    userId?: string,
    authToken?: string
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Call the atomic delete function as an RPC
      const { data, error } = await client.rpc('delete_project_and_tasks', {
        p_project_id: id,
      });

      if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }

      // Verify the RPC returned a success response
      if (!data || !data[0] || !data[0].success) {
        const message = data?.[0]?.message || 'Unknown error';
        throw new Error(`Project deletion failed: ${message}`);
      }

      const duration = Date.now() - startTime;
      console.log(
        `[ProjectService] Deleted project and all related data in ${duration}ms`
      );

      // Trigger auto-schedule if we have userId and authToken
      if (userId && authToken) {
        try {
          await autoScheduleTriggerQueue.triggerAndWait(userId, authToken);
        } catch (err) {
          console.error(
            `[ProjectService] Auto-schedule trigger failed for user ${userId}:`,
            err
          );
        }
      }

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[ProjectService] Delete failed after ${duration}ms:`,
        error
      );
      throw error;
    }
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
