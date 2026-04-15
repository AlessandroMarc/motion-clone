/**
 * Domain entity types and data model.
 * Re-exported from shared so frontend imports from @/types only.
 */
export type {
  Task,
  Project,
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
  WorkItemStatus,
} from '@shared/types';
export { isCalendarEventTask, isCalendarEventDayBlock } from '@shared/types';
