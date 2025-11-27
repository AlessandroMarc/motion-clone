import type { Task } from '@/../../shared/types';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date | null;
  priority: 'low' | 'medium' | 'high';
  project_id?: string;
  blockedBy?: string[];
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  project_id?: string | null;
  blockedBy?: string[];
  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;
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

      // Get auth token
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
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
    const payload = {
      title: input.title,
      description: input.description,
      due_date: input.dueDate?.toISOString(),
      priority: input.priority,
      dependencies: [],
      blocked_by: input.blockedBy || [],
      project_id: input.project_id,
      planned_duration_minutes: input.plannedDurationMinutes,
      actual_duration_minutes: input.actualDurationMinutes ?? 0,
    };
    console.log('Task service payload:', payload);

    const response = await this.request<any>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create task');
    }

    // Transform backend data to frontend format
    return {
      ...response.data,
      due_date: response.data.due_date
        ? new Date(response.data.due_date)
        : null,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
      planned_duration_minutes: response.data.planned_duration_minutes,
      actual_duration_minutes: response.data.actual_duration_minutes,
      blockedBy: response.data.blocked_by || [],
    };
  }

  async getAllTasks(): Promise<Task[]> {
    const response = await this.request<any[]>('/api/tasks');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks');
    }

    // Transform backend data to frontend format
    return response.data.map(task => ({
      ...task,
      due_date: task.due_date ? new Date(task.due_date) : null,
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at),
      blockedBy: task.blocked_by || [],
    }));
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await this.request<any>(`/api/tasks/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch task');
    }

    // Transform backend data to frontend format
    return {
      ...response.data,
      due_date: response.data.due_date
        ? new Date(response.data.due_date)
        : null,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
      planned_duration_minutes: response.data.planned_duration_minutes,
      actual_duration_minutes: response.data.actual_duration_minutes,
      blockedBy: response.data.blocked_by || [],
    };
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const response = await this.request<any>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
      ...input,
      due_date: input.dueDate?.toISOString(),
      project_id: input.project_id,
      blocked_by: input.blockedBy,
      planned_duration_minutes: input.plannedDurationMinutes,
        actual_duration_minutes: input.actualDurationMinutes,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update task');
    }

    // Transform backend data to frontend format
    return {
      ...response.data,
      due_date: response.data.due_date
        ? new Date(response.data.due_date)
        : null,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
      planned_duration_minutes: response.data.planned_duration_minutes,
      actual_duration_minutes: response.data.actual_duration_minutes,
      blockedBy: response.data.blocked_by || [],
    };
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
    const response = await this.request<any[]>(
      `/api/tasks?project_id=${projectId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by project');
    }

    // Transform backend data to frontend format
    return response.data.map(task => ({
      ...task,
      due_date: task.due_date ? new Date(task.due_date) : null,
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at),
      blockedBy: task.blocked_by || [],
    }));
  }

  async getTasksByStatus(
    status: 'pending' | 'in-progress' | 'completed'
  ): Promise<Task[]> {
    const response = await this.request<any[]>(`/api/tasks?status=${status}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by status');
    }

    // Transform backend data to frontend format
    return response.data.map(task => ({
      ...task,
      due_date: task.due_date ? new Date(task.due_date) : null,
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at),
      blockedBy: task.blocked_by || [],
    }));
  }
}

export const taskService = new TaskService();
