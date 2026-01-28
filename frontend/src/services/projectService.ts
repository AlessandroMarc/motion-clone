import type { Project, CreateProjectData, UpdateProjectData } from '@/types';
import { request } from './apiClient';
import { normalizeToMidnight } from '@/utils/dateUtils';

class ProjectService {
  async getAllProjects(): Promise<Project[]> {
    const response = await request<Project[]>('/projects');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch projects');
    }

    return response.data;
  }

  async getProjectById(id: string): Promise<Project> {
    const response = await request<Project>(`/projects/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch project');
    }

    return response.data;
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        deadline: data.deadline
          ? normalizeToMidnight(
              data.deadline instanceof Date
                ? data.deadline
                : new Date(data.deadline)
            ).toISOString()
          : null,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create project');
    }

    return response.data;
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        deadline: data.deadline
          ? normalizeToMidnight(
              data.deadline instanceof Date
                ? data.deadline
                : new Date(data.deadline)
            ).toISOString()
          : null,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update project');
    }

    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    const response = await request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete project');
    }
  }
}

export const projectService = new ProjectService();
