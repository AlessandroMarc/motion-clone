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
  DayOfWeek,
  DaySchedule,
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
  schedule_id?: string; // optional: auto-resolved from user's active schedule if omitted
  start_date?: Date | null; // earliest date this task may be scheduled (optional)
  // Recurring task fields
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly';
  recurrence_interval?: number;
  recurrence_start_date?: Date | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  schedule_id?: string | null;
  dependencies?: string[];
  blockedBy?: string[];
  project_id?: string;
  user_id?: string;
  planned_duration_minutes?: number;
  actual_duration_minutes?: number;
  start_date?: Date | null; // earliest date this task may be scheduled (optional)
  // Recurring task fields
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_interval?: number | null;
  recurrence_start_date?: Date | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  deadline?: Date | string | null;
  schedule_id?: string | null;
  status?: 'not-started' | 'in-progress' | 'completed';
  user_id: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  deadline?: Date | string | null;
  schedule_id?: string | null;
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
