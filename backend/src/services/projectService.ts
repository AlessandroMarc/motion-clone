import { supabase } from '../config/supabase.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/database.js';
import type { Project } from '@shared/types.js';

export class ProjectService {
  // Create a new project
  async createProject(input: CreateProjectInput): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name: input.name,
          description: input.description,
          deadline: input.deadline?.toISOString(),
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
  async getAllProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data || [];
  }

  // Get project by ID
  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
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
  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
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
      updateData.deadline = input.deadline?.toISOString() ?? null;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabase
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
  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }

    return true;
  }

  // Get projects by status
  async getProjectsByStatus(
    status: 'not-started' | 'in-progress' | 'completed'
  ): Promise<Project[]> {
    const { data, error } = await supabase
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
