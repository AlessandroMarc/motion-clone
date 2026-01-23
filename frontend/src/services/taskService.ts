import type { Task } from '@shared/types';
import { request } from './apiClient';
import { toTask, toTasks, type UnknownRecord } from './transforms';

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

class TaskService {
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

    const response = await request<UnknownRecord>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create task');
    }

    return toTask(response.data);
  }

  async getAllTasks(): Promise<Task[]> {
    const response = await request<UnknownRecord[]>('/tasks');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks');
    }

    return toTasks(response.data);
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await request<UnknownRecord>(`/tasks/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch task');
    }

    return toTask(response.data);
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    // Build payload without dueDate (we use due_date instead)
    const { dueDate, blockedBy, plannedDurationMinutes, actualDurationMinutes, ...rest } = input;
    
    const response = await request<UnknownRecord>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...rest,
        due_date: dueDate?.toISOString() ?? null,
        project_id: input.project_id,
        blocked_by: blockedBy,
        planned_duration_minutes: plannedDurationMinutes,
        actual_duration_minutes: actualDurationMinutes,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update task');
    }

    return toTask(response.data);
  }

  async deleteTask(id: string): Promise<void> {
    const response = await request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task');
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const response = await request<UnknownRecord[]>(`/tasks?project_id=${projectId}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by project');
    }

    return toTasks(response.data);
  }

  async getTasksByStatus(
    status: 'pending' | 'in-progress' | 'completed'
  ): Promise<Task[]> {
    const response = await request<UnknownRecord[]>(`/tasks?status=${status}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks by status');
    }

    return toTasks(response.data);
  }
}

export const taskService = new TaskService();
