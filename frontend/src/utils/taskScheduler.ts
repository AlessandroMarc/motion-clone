import type { Task, CalendarEventTask, CalendarEventUnion } from '@/../../../shared/types';
import { isCalendarEventTask } from '@/../../../shared/types';

export interface TaskSchedulingConfig {
  eventDurationMinutes: number;
  workingHoursStart: number; // 9
  workingHoursEnd: number; // 22
  skipWeekends?: boolean;
  sortStrategy?: (tasks: Task[]) => Task[];
  defaultDaysWithoutDeadline?: number; // Default days to schedule tasks without deadline
}

export const DEFAULT_CONFIG: TaskSchedulingConfig = {
  eventDurationMinutes: 60,
  workingHoursStart: 9,
  workingHoursEnd: 22,
  skipWeekends: false,
  defaultDaysWithoutDeadline: 14,
};

export interface ScheduledEvent {
  start_time: Date;
  end_time: Date;
}

/**
 * Calculate how many events are needed to cover the remaining planned duration
 */
export function calculateRequiredEvents(
  task: Task,
  existingEvents: CalendarEventTask[],
  config: TaskSchedulingConfig
): number {
  // Calculate total duration already covered by existing events
  const existingDuration = existingEvents.reduce((total, event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    return total + duration;
  }, 0);

  // Calculate remaining duration needed
  const remainingDuration = Math.max(0, task.planned_duration_minutes - existingDuration);

  // Calculate number of events needed
  const eventsNeeded = Math.ceil(remainingDuration / config.eventDurationMinutes);

  return eventsNeeded;
}

/**
 * Check if two time ranges overlap
 */
function doEventsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Check if a time slot overlaps with any existing calendar events
 */
function isSlotOccupied(
  slot: ScheduledEvent,
  existingEvents: CalendarEventUnion[]
): boolean {
  return existingEvents.some(event => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    return doEventsOverlap(
      slot.start_time,
      slot.end_time,
      eventStart,
      eventEnd
    );
  });
}

/**
 * Get available time slots for a given day within working hours, excluding occupied slots
 */
function getAvailableTimeSlots(
  date: Date,
  config: TaskSchedulingConfig,
  existingEvents: CalendarEventUnion[] = []
): ScheduledEvent[] {
  const slots: ScheduledEvent[] = [];
  const day = new Date(date);
  day.setHours(config.workingHoursStart, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(config.workingHoursEnd, 0, 0, 0);

  while (day < endOfDay) {
    const slotEnd = new Date(day);
    slotEnd.setMinutes(slotEnd.getMinutes() + config.eventDurationMinutes);

    if (slotEnd <= endOfDay) {
      const slot: ScheduledEvent = {
        start_time: new Date(day),
        end_time: new Date(slotEnd),
      };

      // Only add slot if it doesn't overlap with existing events
      if (!isSlotOccupied(slot, existingEvents)) {
        slots.push(slot);
      }
    }

    day.setMinutes(day.getMinutes() + config.eventDurationMinutes);
  }

  return slots;
}

/**
 * Get all available days from start date to end date
 */
function getAvailableDays(
  startDate: Date,
  endDate: Date,
  config: TaskSchedulingConfig
): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Skip weekends if configured
    if (config.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Round time to next 15-minute interval
 */
function roundToNext15Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;
  
  if (remainder === 0) {
    // Already on a 15-minute boundary, add 15 minutes
    rounded.setMinutes(minutes + 15);
  } else {
    // Round up to next 15-minute boundary
    rounded.setMinutes(minutes + (15 - remainder));
  }
  
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

/**
 * Get the next available time slot starting from a given time
 * Returns null if no slot is available before end of day
 */
function getNextAvailableSlot(
  startFrom: Date,
  config: TaskSchedulingConfig,
  allExistingEvents: CalendarEventUnion[],
  gapMinutes: number = 5
): ScheduledEvent | null {
  let currentTime = new Date(startFrom);
  const endOfDay = new Date(currentTime);
  endOfDay.setHours(config.workingHoursEnd, 0, 0, 0);

  // Ensure we're within working hours
  if (currentTime.getHours() < config.workingHoursStart) {
    currentTime.setHours(config.workingHoursStart, 0, 0, 0);
  }

  // If we're past end of day, return null (will need to move to next day)
  if (currentTime >= endOfDay) {
    return null;
  }

  // Try to find an available slot
  while (currentTime < endOfDay) {
    const slotEnd = new Date(currentTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + config.eventDurationMinutes);

    // Check if slot would go past end of day
    if (slotEnd > endOfDay) {
      return null;
    }

    const slot: ScheduledEvent = {
      start_time: new Date(currentTime),
      end_time: new Date(slotEnd),
    };

    // Check if slot is available (no overlaps)
    if (!isSlotOccupied(slot, allExistingEvents)) {
      return slot;
    }

    // Move to next slot position (try next slot start time)
    // We increment by event duration to check if the slot after this one is free
    currentTime.setMinutes(currentTime.getMinutes() + config.eventDurationMinutes);
  }

  return null;
}

/**
 * Schedule events consecutively starting from a given time
 * Events are placed back-to-back with a small gap, moving to next day if needed
 */
export function distributeEvents(
  task: Task,
  requiredEvents: number,
  config: TaskSchedulingConfig,
  allExistingEvents: CalendarEventUnion[] = [],
  startFrom?: Date
): ScheduledEvent[] {
  if (requiredEvents <= 0) {
    return [];
  }

  // Start from provided time or round current time to next 15 minutes
  let currentTime = startFrom 
    ? new Date(startFrom)
    : roundToNext15Minutes(new Date());

  // Determine end date
  let endDate: Date;
  if (task.due_date) {
    endDate = new Date(task.due_date);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Use default days for tasks without deadline
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (config.defaultDaysWithoutDeadline || 14));
    endDate.setHours(23, 59, 59, 999);
  }

  // Ensure end date is not before current time
  if (endDate < currentTime) {
    endDate = new Date(currentTime);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  }

  const events: ScheduledEvent[] = [];
  const gapMinutes = 5; // 5 minutes gap between events

  // Track scheduled events to avoid overlaps within the same batch
  const scheduledEvents: CalendarEventUnion[] = [...allExistingEvents];

  for (let i = 0; i < requiredEvents; i++) {
    // Get next available slot starting from current time
    let slot = getNextAvailableSlot(currentTime, config, scheduledEvents, gapMinutes);

    // If no slot available today, move to next day
    if (!slot) {
      // Move to next day at 9:00
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(config.workingHoursStart, 0, 0, 0);
      currentTime.setMinutes(0);
      currentTime.setSeconds(0);
      currentTime.setMilliseconds(0);

      // Check if we've exceeded the end date
      if (currentTime > endDate) {
        // Can't schedule all events before deadline
        break;
      }

      slot = getNextAvailableSlot(currentTime, config, scheduledEvents, gapMinutes);
      if (!slot) {
        // Still no slot available, skip this event
        break;
      }
    }

    events.push(slot);

    // Add this event to scheduled events to avoid overlaps
    scheduledEvents.push({
      id: `temp-${task.id}-${slot.start_time.getTime()}`,
      title: task.title,
      start_time: slot.start_time,
      end_time: slot.end_time,
      description: task.description,
      user_id: task.user_id,
      created_at: new Date(),
      updated_at: new Date(),
    } as CalendarEventUnion);

    // Move current time to end of this event + gap for next event
    currentTime = new Date(slot.end_time);
    currentTime.setMinutes(currentTime.getMinutes() + gapMinutes);
  }

  return events;
}

/**
 * Sort tasks for scheduling: by due_date (nulls last), then by priority
 */
export function sortTasksForScheduling(
  tasks: Task[],
  config: TaskSchedulingConfig = DEFAULT_CONFIG
): Task[] {
  const sortStrategy = config.sortStrategy || defaultSortStrategy;
  return sortStrategy([...tasks]);
}

function defaultSortStrategy(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    // First, sort by due_date (nulls last)
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && b.due_date) {
      const dateDiff = a.due_date.getTime() - b.due_date.getTime();
      if (dateDiff !== 0) return dateDiff;
    }

    // Then by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Check which events violate the task deadline
 */
export function checkDeadlineViolations(
  events: ScheduledEvent[],
  task: Task
): ScheduledEvent[] {
  if (!task.due_date) {
    return [];
  }

  const deadline = new Date(task.due_date);
  deadline.setHours(23, 59, 59, 999);

  return events.filter(event => event.start_time > deadline);
}

/**
 * Prepare events for a task, calculating required events and distributing them
 * @param task - The task to schedule
 * @param existingTaskEvents - Existing calendar events linked to this specific task
 * @param config - Scheduling configuration
 * @param allExistingEvents - All existing calendar events (to avoid overlaps)
 * @param startFrom - Time to start scheduling from (defaults to now rounded to next 15 minutes)
 */
export function prepareTaskEvents(
  task: Task,
  existingTaskEvents: CalendarEventTask[],
  config: TaskSchedulingConfig,
  allExistingEvents: CalendarEventUnion[] = [],
  startFrom?: Date
): {
  events: ScheduledEvent[];
  violations: ScheduledEvent[];
} {
  const requiredEvents = calculateRequiredEvents(task, existingTaskEvents, config);
  const events = distributeEvents(task, requiredEvents, config, allExistingEvents, startFrom);
  const violations = checkDeadlineViolations(events, task);

  return { events, violations };
}

