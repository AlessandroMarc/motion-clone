export type WorkItemStatus = 'not-started' | 'in-progress' | 'completed';

interface Task {
  id: string; // unique identifier
  title: string;
  description?: string;
  due_date: Date | null; // optional deadline
  priority: 'low' | 'medium' | 'high';
  status: WorkItemStatus;
  dependencies: string[]; // array of Task ids this task depends on
  project_id?: string; // linked project, if any
  user_id: string; // owner of the task
  created_at: Date;
  updated_at: Date;
  planned_duration_minutes: number;
  actual_duration_minutes: number;
}

interface Project {
  id: string; // unique identifier
  name: string;
  description?: string;
  deadline: Date | null;
  milestones: Milestone[];
  status: WorkItemStatus;
  user_id: string; // owner of the project
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string; // unique identifier
  title: string;
  description?: string;
  dueDate: Date | null;
  status: WorkItemStatus;
  tasks: string[]; // array of Task ids under this milestone
  user_id: string; // owner of the milestone
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  linked_task_id?: string;
  description?: string;
  user_id: string; // owner of the calendar event
  created_at: Date;
  updated_at: Date;
}

export type { Task, Project, Milestone, CalendarEvent };
