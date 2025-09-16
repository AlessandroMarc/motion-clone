interface Task {
  id: string; // unique identifier
  title: string;
  description?: string;
  due_date: Date | null; // optional deadline
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[]; // array of Task ids this task depends on
  project_id?: string; // linked project, if any
  created_at: Date;
  updated_at: Date;
}

interface Project {
  id: string; // unique identifier
  name: string;
  description?: string;
  deadline: Date | null;
  milestones: Milestone[];
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string; // unique identifier
  title: string;
  description?: string;
  dueDate: Date | null;
  status: 'not-started' | 'in-progress' | 'completed';
  tasks: string[]; // array of Task ids under this milestone
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  linkedTaskId?: string;
  linkedProjectId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type { Task, Project, Milestone, CalendarEvent };
