import type { Project } from '@/../../../shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface CreateProjectData {
  name: string;
  description?: string;
  deadline?: Date | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  deadline?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  count?: number;
}

class ProjectService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('Making API request to:', url);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: 'Failed to connect to the server',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAllProjects(): Promise<Project[]> {
    const response = await this.request<Project[]>('/api/projects');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch projects');
    }

    return response.data;
  }

  async getProjectById(id: string): Promise<Project> {
    const response = await this.request<Project>(`/api/projects/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch project');
    }

    return response.data;
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await this.request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        deadline: data.deadline
          ? data.deadline instanceof Date
            ? data.deadline.toISOString()
            : data.deadline
          : null,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create project');
    }

    return response.data;
  }

  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await this.request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        deadline: data.deadline
          ? data.deadline instanceof Date
            ? data.deadline.toISOString()
            : data.deadline
          : null,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update project');
    }

    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    const response = await this.request<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete project');
    }
  }
}

export const projectService = new ProjectService();
