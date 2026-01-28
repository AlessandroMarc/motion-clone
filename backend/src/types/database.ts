// Re-export shared entity types so backend code imports only from backend types
export type {
  Task,
  Project,
  Milestone,
  CalendarEvent,
  CalendarEventTask,
  CalendarEventUnion,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  Schedule,
  UserSettings,
  OnboardingStatus,
  OnboardingStep,
} from '../../../shared/types.js';
export { isCalendarEventTask } from '../../../shared/types.js';

// Database-specific types that extend or modify shared types
export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: Date | null;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  blockedBy?: string[];
  project_id?: string;
  user_id: string;
  planned_duration_minutes: number;
  actual_duration_minutes?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
  blockedBy?: string[];
  project_id?: string;
  user_id?: string;
  planned_duration_minutes?: number;
  actual_duration_minutes?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  deadline?: Date | string | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  user_id: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  deadline?: Date | string | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  user_id?: string;
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  due_date?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  project_id: string;
  user_id: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  due_date?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  project_id?: string;
  user_id?: string;
}
