export type WorkItemStatus = 'not-started' | 'in-progress' | 'completed';

interface Task {
  id: string; // unique identifier
  title: string;
  description?: string;
  due_date: Date | null; // optional deadline
  priority: 'low' | 'medium' | 'high';
  status: WorkItemStatus;
  dependencies: string[]; // array of Task ids this task depends on
  blockedBy?: string[]; // array of Task ids that block this task
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
  description?: string;
  user_id: string; // owner of the calendar event
  created_at: Date;
  updated_at: Date;
  // Explicitly exclude task-related fields
  linked_task_id?: never;
  completed_at?: never;
}

interface CalendarEventTask
  extends Omit<CalendarEvent, 'linked_task_id' | 'completed_at'> {
  linked_task_id: string; // required for task events
  completed_at: Date | null;
}

// Union type for when we don't know which type it is
type CalendarEventUnion = CalendarEvent | CalendarEventTask;

// Type guard to check if an event is a task event
function isCalendarEventTask(
  event: CalendarEventUnion
): event is CalendarEventTask {
  return (
    'linked_task_id' in event &&
    event.linked_task_id !== undefined &&
    event.linked_task_id !== null
  );
}

export type {
  Task,
  Project,
  Milestone,
  CalendarEvent,
  CalendarEventTask,
  CalendarEventUnion,
};
export { isCalendarEventTask };
