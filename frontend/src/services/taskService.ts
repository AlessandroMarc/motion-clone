import type { Task } from '@/../../shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date | null;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  count?: number;
}

class TaskService {
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

  async createTask(input: CreateTaskInput): Promise<Task> {
    const response = await this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        due_date: input.dueDate?.toISOString(),
        priority: input.priority,
        status: 'pending',
        dependencies: [],
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create task');
    }

    return response.data;
  }

  async getAllTasks(): Promise<Task[]> {
    const response = await this.request<Task[]>('/api/tasks');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks');
    }

    return response.data;
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await this.request<Task>(`/api/tasks/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch task');
    }

    return response.data;
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const response = await this.request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...input,
        due_date: input.dueDate?.toISOString(),
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update task');
    }

    return response.data;
  }

  async deleteTask(id: string): Promise<void> {
    const response = await this.request<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task');
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const response = await this.request<Task[]>(
      `/api/tasks?project_id=${projectId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by project');
    }

    return response.data;
  }

  async getTasksByStatus(
    status: 'pending' | 'in-progress' | 'completed'
  ): Promise<Task[]> {
    const response = await this.request<Task[]>(`/api/tasks?status=${status}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by status');
    }

    return response.data;
  }
}

export const taskService = new TaskService();
