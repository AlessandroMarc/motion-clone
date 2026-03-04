import type { Task, Project, CalendarEventUnion } from './entities';

/** Task create payload (frontend API shape). */
export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date | null;
  priority: 'low' | 'medium' | 'high';
  scheduleId?: string;
  project_id?: string;
  blockedBy?: string[];
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
  // Recurring task fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  recurrenceStartDate?: Date | null;
  startDate?: Date | null; // earliest date this task may be scheduled
}

/** Task update payload (frontend API shape). */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  scheduleId?: string | null;
  project_id?: string | null;
  blockedBy?: string[];
  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;
  // Recurring task fields
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceInterval?: number | null;
  recurrenceStartDate?: Date | null;
  startDate?: Date | null; // earliest date this task may be scheduled
}

/** Project create payload (frontend API shape). */
export interface CreateProjectData {
  name: string;
  description?: string;
  deadline?: Date | null;
  user_id: string;
}

/** Project update payload (frontend API shape). */
export interface UpdateProjectData {
  name?: string;
  description?: string;
  deadline?: Date | null;
  status?: 'not-started' | 'in-progress' | 'completed';
}

/** Task list view data shape. */
export interface TaskListData {
  tasks: Task[];
  projects: Project[];
  calendarEvents: CalendarEventUnion[];
}
