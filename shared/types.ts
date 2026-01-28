export type WorkItemStatus = 'not-started' | 'in-progress' | 'completed';

// API DTOs (used across frontend + backend)
interface CreateCalendarEventInput {
  title: string;
  start_time: string;
  end_time: string;
  linked_task_id?: string;
  description?: string;
  user_id: string;
  completed_at?: string | null;
  google_event_id?: string;
  synced_from_google?: boolean;
}

interface UpdateCalendarEventInput {
  title?: string;
  start_time?: string;
  end_time?: string;
  linked_task_id?: string;
  description?: string;
  user_id?: string;
  completed_at?: string | null;
  google_event_id?: string;
  synced_from_google?: boolean;
}

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
  google_event_id?: string | null; // ID from Google Calendar if synced
  synced_from_google?: boolean; // Whether this event was synced from Google Calendar
  // Explicitly exclude task-related fields
  linked_task_id?: never;
  completed_at?: never;
}

interface CalendarEventTask extends Omit<
  CalendarEvent,
  'linked_task_id' | 'completed_at'
> {
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

interface Schedule {
  id: string;
  user_id: string;
  name: string;
  working_hours_start: number; // 0-23
  working_hours_end: number; // 0-23
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

type OnboardingStep = 'task_created' | 'project_created' | 'scheduled' | null;

interface OnboardingStatus {
  completed: boolean;
  step: OnboardingStep;
  started_at: Date | null;
  completed_at: Date | null;
}

interface UserSettings {
  id: string;
  user_id: string;
  active_schedule_id: string | null;
  onboarding_completed?: boolean;
  onboarding_step?: OnboardingStep;
  onboarding_started_at?: Date | null;
  onboarding_completed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

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
};
export { isCalendarEventTask };
