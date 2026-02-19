import { supabase, serviceRoleSupabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../types/database.js';
import type { Milestone } from '../types/database.js';

export class MilestoneService {
  // Create a new milestone
  async createMilestone(
    input: CreateMilestoneInput,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone> {
    const { data, error } = await client
      .from('milestones')
      .insert([
        {
          title: input.title,
          description: input.description,
          due_date: input.due_date?.toISOString(),
          status: input.status || 'not-started',
          project_id: input.project_id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create milestone: ${error.message}`);
    }

    return data;
  }

  // Get all milestones
  async getAllMilestones(
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone[]> {
    const { data, error } = await client
      .from('milestones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch milestones: ${error.message}`);
    }

    return data || [];
  }

  // Get milestone by ID
  async getMilestoneById(
    id: string,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone | null> {
    const { data, error } = await client
      .from('milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Milestone not found
      }
      throw new Error(`Failed to fetch milestone: ${error.message}`);
    }

    return data;
  }

  // Update milestone
  async updateMilestone(
    id: string,
    input: UpdateMilestoneInput,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone> {
    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      due_date?: string | null;
      status?: 'not-started' | 'in-progress' | 'completed';
      project_id?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.due_date !== undefined)
      updateData.due_date = input.due_date?.toISOString() ?? null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.project_id !== undefined)
      updateData.project_id = input.project_id;

    const { data, error } = await client
      .from('milestones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update milestone: ${error.message}`);
    }

    return data;
  }

  // Delete milestone
  async deleteMilestone(
    id: string,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<boolean> {
    const { error } = await client.from('milestones').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete milestone: ${error.message}`);
    }

    return true;
  }

  // Get milestones by project ID
  async getMilestonesByProjectId(
    projectId: string,
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone[]> {
    const { data, error } = await client
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch milestones by project: ${error.message}`
      );
    }

    return data || [];
  }

  // Get milestones by status
  async getMilestonesByStatus(
    status: 'not-started' | 'in-progress' | 'completed',
    client: SupabaseClient = serviceRoleSupabase
  ): Promise<Milestone[]> {
    const { data, error } = await client
      .from('milestones')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch milestones by status: ${error.message}`);
    }

    return data || [];
  }
}
