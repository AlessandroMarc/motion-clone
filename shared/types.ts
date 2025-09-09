// Represents a personal task
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Task {
  id: string; // unique identifier
  title: string;
  description?: string;
  dueDate: Date | null; // optional deadline
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[]; // array of Task ids this task depends on
  projectId?: string; // linked project, if any
  createdAt: Date;
  updatedAt: Date;
}

// Represents a personal project
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Represents a milestone within a project
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

// Represents a calendar entry to integrate tasks/projects into schedule
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
