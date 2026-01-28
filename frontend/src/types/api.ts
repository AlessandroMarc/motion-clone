import type { Task, Project, CalendarEventUnion } from './entities';

/** Task create payload (frontend API shape). */
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

/** Task update payload (frontend API shape). */
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
