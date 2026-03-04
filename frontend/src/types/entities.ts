/**
 * Domain entity types and data model.
 * Re-exported from shared so frontend imports from @/types only.
 */
export type {
  Task,
  Project,
  Milestone,
  CalendarEvent,
  CalendarEventTask,
  CalendarEventUnion,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  DaySchedule,
  Schedule,
  UserSettings,
  OnboardingStatus,
  OnboardingStep,
  WorkItemStatus,
} from '@shared/types';
export { isCalendarEventTask } from '@shared/types';
