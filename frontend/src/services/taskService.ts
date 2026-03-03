import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types';
import { request } from './apiClient';
import { toTask, toTasks, type UnknownRecord } from './transforms';
import { normalizeToMidnight } from '@/utils/dateUtils';

class TaskService {
  async createTask(input: CreateTaskInput): Promise<Task> {
    const payload = {
      title: input.title,
      description: input.description,
      due_date: input.dueDate
        ? normalizeToMidnight(input.dueDate).toISOString()
        : null,
      priority: input.priority,
      schedule_id: input.scheduleId,
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
    const {
      dueDate,
      blockedBy,
      plannedDurationMinutes,
      actualDurationMinutes,
      scheduleId,
      ...rest
    } = input;

    const response = await request<UnknownRecord>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...rest,
        due_date: dueDate ? normalizeToMidnight(dueDate).toISOString() : null,
        project_id: input.project_id,
        schedule_id: scheduleId,
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
    const response = await request<UnknownRecord[]>(
      `/tasks?project_id=${projectId}`
    );

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

  /** Set task completed or incomplete via actualDurationMinutes; returns updated task. */
  async setTaskCompleted(task: Task, completed: boolean): Promise<Task> {
    const actualDurationMinutes = completed
      ? Math.max(task.planned_duration_minutes || 1, 1)
      : 0;
    return this.updateTask(task.id, { actualDurationMinutes });
  }
}

export const taskService = new TaskService();
