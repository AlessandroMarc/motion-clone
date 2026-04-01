import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types';
import { request } from './apiClient';
import { toTask, toTasks, type UnknownRecord } from './transforms';
import { normalizeToMidnight, toLocalDateString } from '@/utils/dateUtils';
import { calendarService } from './calendarService';

class TaskService {
  async createTask(input: CreateTaskInput): Promise<Task> {
    const isRecurring = input.isRecurring ?? false;
    const payload = {
      title: input.title,
      description: input.description,
      due_date:
        !isRecurring && input.dueDate
          ? toLocalDateString(normalizeToMidnight(input.dueDate))
          : null,
      priority: input.priority,
      schedule_id: input.scheduleId,
      dependencies: [],
      blocked_by: input.blockedBy || [],
      project_id: input.project_id,
      planned_duration_minutes: input.plannedDurationMinutes,
      actual_duration_minutes: isRecurring
        ? 0
        : (input.actualDurationMinutes ?? 0),
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? input.recurrencePattern : null,
      recurrence_interval: isRecurring ? (input.recurrenceInterval ?? 1) : 1,
      recurrence_start_date:
        isRecurring && input.recurrenceStartDate
          ? toLocalDateString(normalizeToMidnight(input.recurrenceStartDate))
          : null,
      start_date: input.startDate
        ? toLocalDateString(normalizeToMidnight(input.startDate))
        : null,
      is_reminder: input.isReminder ?? false,
    };

    const response = await request<UnknownRecord>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create task');
    }

    const task = toTask(response.data);

    // Auto-schedule is triggered by backend event queue on task creation
    return task;
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
    console.log('🔧 [taskService.updateTask] Called with id:', id);
    console.log('Input:', input);

    // Build payload without dueDate (we use due_date instead)
    const {
      dueDate,
      blockedBy,
      plannedDurationMinutes,
      actualDurationMinutes,
      scheduleId,
      isRecurring,
      recurrencePattern,
      recurrenceInterval,
      startDate,
      isReminder,
      isManuallyPinned,
      ...rest
    } = input;

    const payload = {
      ...rest,
      due_date: dueDate
        ? toLocalDateString(normalizeToMidnight(dueDate))
        : null,
      project_id: input.project_id,
      schedule_id: scheduleId,
      blocked_by: blockedBy,
      planned_duration_minutes: plannedDurationMinutes,
      actual_duration_minutes: actualDurationMinutes,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern,
      recurrence_interval: recurrenceInterval,
      recurrence_start_date: input.recurrenceStartDate
        ? toLocalDateString(normalizeToMidnight(input.recurrenceStartDate))
        : undefined,
      start_date:
        startDate !== undefined
          ? startDate
            ? toLocalDateString(normalizeToMidnight(startDate))
            : null
          : undefined,
      is_reminder: isReminder,
      is_manually_pinned: input.isManuallyPinned,
    };

    console.log('📤 [taskService.updateTask] Sending payload:', payload);

    const response = await request<UnknownRecord>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    console.log('📬 [taskService.updateTask] Response received:', response);

    if (!response.success || !response.data) {
      console.error('❌ [taskService.updateTask] API Error:', response.error);
      throw new Error(response.error || 'Failed to update task');
    }

    const updatedTask = toTask(response.data);
    console.log(
      '✅ [taskService.updateTask] Task updated successfully:',
      JSON.parse(JSON.stringify(updatedTask))
    );

    // Auto-schedule is now handled synchronously by the backend
    // The backend waits for auto-schedule to complete before returning,
    // ensuring the calendar is deduplicated when the frontend refreshes

    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    const response = await request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task');
    }

    // Auto-schedule is now handled synchronously by the backend
    // The backend waits for auto-schedule to complete before returning,
    // ensuring the calendar is deduplicated when the frontend refreshes
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

  /** Complete a task AND mark all its linked calendar events as completed. */
  async completeTaskWithEvents(task: Task): Promise<Task> {
    // Complete the task first — it's the authoritative record
    const updatedTask = await this.setTaskCompleted(task, true);

    // Then best-effort update all linked calendar events
    const events = await calendarService.getCalendarEventsByTaskId(task.id);
    const incompleteEvents = events.filter(e => !e.completed_at);

    if (incompleteEvents.length > 0) {
      const results = await Promise.allSettled(
        incompleteEvents.map(e =>
          calendarService.updateCalendarEvent(e.id, {
            completed_at: new Date().toISOString(),
          })
        )
      );
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(
          `[TaskService] ${failures.length}/${incompleteEvents.length} event completions failed`
        );
      }
    }

    return updatedTask;
  }
}

export const taskService = new TaskService();
