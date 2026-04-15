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
  is_all_day?: boolean;
  is_day_block?: boolean;
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
  is_all_day?: boolean;
  is_day_block?: boolean;
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
  // Schedule association for task scheduling
  schedule_id?: string;
  // Scheduling constraints
  start_date?: Date | null; // earliest date this task may be scheduled (optional)
  // Recurring task fields
  is_recurring: boolean; // whether this task repeats
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly'; // frequency (required if is_recurring)
  recurrence_interval?: number; // interval count, e.g., 2 for "every 2 weeks" (required if is_recurring, min: 1)
  recurrence_start_date?: Date | null; // anchor date: sets the day-of-week / day-of-month for the pattern
  next_generation_cutoff?: Date | null; // tracks how far into the future calendar events have been generated
  is_reminder?: boolean; // if true: shown in calendar banner on due_date, not auto-scheduled
  is_manually_pinned?: boolean; // if true: auto-scheduler will not move or delete this task's calendar events
}

interface Project {
  id: string; // unique identifier
  name: string;
  description?: string;
  deadline: Date | null;
  // Optional schedule override for tasks created within this project.
  // If set, tasks will default to this schedule when no schedule is explicitly chosen.
  schedule_id?: string | null;
  milestones: Milestone[];
  status: WorkItemStatus;
  user_id: string; // owner of the project
  created_at: Date;
  updated_at: Date;
}

interface Milestone {
  id: string; // unique identifier
  title: string;
  description?: string;
  due_date: Date | null;
  status: WorkItemStatus;
  tasks: string[]; // array of Task ids under this milestone
  user_id: string; // owner of the milestone
  created_at: Date;
  updated_at: Date;
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
  is_all_day?: boolean; // Whether this is an all-day event (from Google Calendar)
  is_day_block?: boolean; // Whether this event is a user-created day block
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

// Type guard to check if an event is a user-created day block
function isCalendarEventDayBlock(
  event: CalendarEventUnion
): event is CalendarEvent & { is_day_block: true } {
  return (event as CalendarEvent).is_day_block === true;
}

/**
 * Valid day-of-week indices: 0 (Sunday) through 6 (Saturday)
 */
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DaySchedule {
  start: number; // 0-23
  end: number; // 0-23
}

interface Schedule {
  id: string;
  user_id: string;
  name: string;
  working_hours_start: number; // 0-23 (legacy fallback, used when working_days is absent)
  working_hours_end: number; // 0-23 (legacy fallback, used when working_days is absent)
  working_days?: Record<DayOfWeek, DaySchedule | null>; // per-day overrides: key = day-of-week (0=Sun…6=Sat), null = not a working day
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

type OnboardingStep =
  | 'task_created'
  | 'project_created'
  | 'scheduled'
  | 'calendar_synced'
  | null;

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
  DayOfWeek,
  DaySchedule,
  Schedule,
  UserSettings,
  OnboardingStatus,
  OnboardingStep,
};
export { isCalendarEventTask, isCalendarEventDayBlock };
