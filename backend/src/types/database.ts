// Re-export shared types for convenience
export type { Task, Project, Milestone, CalendarEvent } from '@shared/types.js';

// Database-specific types that extend or modify shared types
export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: Date | null;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  dependencies?: string[];
  project_id?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  dependencies?: string[];
  project_id?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  deadline?: Date | string | null;
  status?: 'not-started' | 'in-progress' | 'completed';
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  deadline?: Date | string | null;
  status?: 'not-started' | 'in-progress' | 'completed';
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  due_date?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  project_id: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  due_date?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  project_id?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  start_time: string;
  end_time: string;
  linked_task_id?: string;
  linked_project_id?: string;
  description?: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  start_time?: string;
  end_time?: string;
  linked_task_id?: string;
  linked_project_id?: string;
  description?: string;
}
