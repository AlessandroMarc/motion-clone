import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
} from '@/types';
import { TASK_PRIORITY_RANK } from '@/utils/taskUtils';

export interface TaskSchedulingConfig {
  eventDurationMinutes: number;
  workingHoursStart: number; // 9
  workingHoursEnd: number; // 22
  skipWeekends?: boolean;
  sortStrategy?: (tasks: Task[]) => Task[];
  defaultDaysWithoutDeadline?: number;
  minBlockMinutes?: number; // Minimum duration for a partial block
  gapBetweenEventsMinutes?: number; // Gap between events
}

export const DEFAULT_CONFIG: TaskSchedulingConfig = {
  eventDurationMinutes: 60,
  workingHoursStart: 9,
  workingHoursEnd: 22,
  skipWeekends: false,
  defaultDaysWithoutDeadline: 14,
  minBlockMinutes: 15,
  gapBetweenEventsMinutes: 5,
};

/**
 * Create a TaskSchedulingConfig from a Schedule
 */
export function createConfigFromSchedule(
  schedule: Schedule | null,
  eventDurationMinutes = 60
): TaskSchedulingConfig {
  return {
    ...DEFAULT_CONFIG,
    eventDurationMinutes,
    workingHoursStart:
      schedule?.working_hours_start ?? DEFAULT_CONFIG.workingHoursStart,
    workingHoursEnd:
      schedule?.working_hours_end ?? DEFAULT_CONFIG.workingHoursEnd,
  };
}

export interface ScheduledEvent {
  task_id: string;
  start_time: Date;
  end_time: Date;
}

/**
 * Calculate remaining planned minutes after accounting for work already done.
 * Subtracts both `task.actual_duration_minutes` and the total duration of
 * existing calendar events linked to this task from the planned duration.
 * If planned_duration_minutes is 0 or unset, we return one block's worth so the
 * task still gets scheduled during auto-schedule.
 */
export function calculateRemainingDurationMinutes(
  task: Task,
  existingEvents: CalendarEventTask[],
  config: TaskSchedulingConfig
): number {
  const planned = task.planned_duration_minutes ?? 0;
  const actual = task.actual_duration_minutes ?? 0;

  const existingEventsDuration = existingEvents.reduce((total, event) => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();
    return total + Math.max(0, (end - start) / (1000 * 60));
  }, 0);

  const remainingDuration = Math.max(
    0,
    planned - actual - existingEventsDuration
  );

  // Tasks with 0 planned (or already covered) get a single block so they still appear
  return remainingDuration === 0 && planned === 0
    ? config.eventDurationMinutes
    : remainingDuration;
}

/**
 * Check if a time slot overlaps with any existing calendar events
 */

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
interface TimeRange {
  start: number;
  end: number;
}

function getNextAvailableSlot(
  startFrom: number,
  config: TaskSchedulingConfig,
  taskId: string,
  sortedExistingEvents: TimeRange[],
  remainingMinutes: number
): ScheduledEvent | null {
  let currentTime = startFrom;
  const dateObj = new Date(startFrom);
  dateObj.setHours(config.workingHoursEnd, 0, 0, 0);
  const endOfDay = dateObj.getTime();

  // Ensure we're within working hours
  const workingStartObj = new Date(startFrom);
  workingStartObj.setHours(config.workingHoursStart, 0, 0, 0);
  const workingStart = workingStartObj.getTime();

  if (currentTime < workingStart) {
    currentTime = workingStart;
  }

  if (currentTime >= endOfDay) {
    return null;
  }

  const gapMs = (config.gapBetweenEventsMinutes ?? 5) * 60 * 1000;
  const minBlockMs = (config.minBlockMinutes ?? 15) * 60 * 1000;
  let iterations = 0;
  const MAX_ITERATIONS = 100; // Guard against infinite loops

  while (currentTime < endOfDay && iterations < MAX_ITERATIONS) {
    iterations++;

    // Find first event that might overlap or be after currentTime
    const overlappingIndex = sortedExistingEvents.findIndex(
      e => e.end > currentTime
    );

    if (overlappingIndex === -1) {
      // No more events today, the rest of the day is free
      const availableMs = endOfDay - currentTime;
      if (availableMs < minBlockMs) return null;

      const durationMs = Math.min(
        config.eventDurationMinutes * 60 * 1000,
        remainingMinutes * 60 * 1000,
        availableMs
      );

      return {
        task_id: taskId,
        start_time: new Date(currentTime),
        end_time: new Date(currentTime + durationMs),
      };
    }

    const event = sortedExistingEvents[overlappingIndex];

    // If currentTime is inside an event, skip to the end of it
    if (currentTime < event.end && currentTime + minBlockMs > event.start) {
      currentTime = event.end + gapMs;
      continue;
    }

    // There is a gap before the next event
    const nextBoundary = Math.min(endOfDay, event.start);
    const availableMs = nextBoundary - currentTime;

    if (availableMs >= minBlockMs) {
      const durationMs = Math.min(
        config.eventDurationMinutes * 60 * 1000,
        remainingMinutes * 60 * 1000,
        availableMs
      );

      return {
        task_id: taskId,
        start_time: new Date(currentTime),
        end_time: new Date(currentTime + durationMs),
      };
    }

    // Gap too small, skip past this event
    currentTime = event.end + gapMs;
  }

  return null;
}

/**
 * Schedule events consecutively starting from a given time
 * Events are placed back-to-back with a small gap, moving to next day if needed
 */
export function distributeEvents(
  task: Task,
  remainingMinutes: number,
  config: TaskSchedulingConfig,
  allExistingEvents: CalendarEventUnion[] = [],
  startFrom?: Date
): ScheduledEvent[] {
  if (remainingMinutes <= 0) {
    return [];
  }

  // Start from provided time, or use working hours start if current time is before it
  let currentTime: Date;
  if (startFrom) {
    currentTime = new Date(startFrom);
  } else {
    const now = new Date();
    const roundedNow = roundToNext15Minutes(now);
    const workingHoursStart = new Date(now);
    workingHoursStart.setHours(config.workingHoursStart, 0, 0, 0);
    workingHoursStart.setSeconds(0);
    workingHoursStart.setMilliseconds(0);
    // Use the later of: working hours start or current time (rounded)
    currentTime =
      roundedNow > workingHoursStart ? roundedNow : workingHoursStart;
  }

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
    endDate.setDate(
      endDate.getDate() + (config.defaultDaysWithoutDeadline || 14)
    );
    endDate.setHours(23, 59, 59, 999);
  }

  // Ensure end date is not before current time
  if (endDate < currentTime) {
    endDate = new Date(currentTime);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  }

  const events: ScheduledEvent[] = [];
  const gapMs = (config.gapBetweenEventsMinutes ?? 5) * 60 * 1000;

  // Pre-process and sort existing events for efficiency
  const sortedExistingEvents: TimeRange[] = allExistingEvents
    .map(e => ({
      start: new Date(e.start_time).getTime(),
      end: new Date(e.end_time).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  const skipWeekends = config.skipWeekends ?? false;

  while (remainingMinutes > 0) {
    // Get next available slot starting from current time
    let slot = getNextAvailableSlot(
      currentTime.getTime(),
      config,
      task.id,
      sortedExistingEvents,
      remainingMinutes
    );

    // If no slot available today, advance day-by-day until we find one or pass endDate
    let daysSearched = 0;
    const MAX_DAYS = 365; // Don't search infinitely

    while (!slot && daysSearched < MAX_DAYS) {
      daysSearched++;
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(config.workingHoursStart, 0, 0, 0);
      currentTime.setMinutes(0);
      currentTime.setSeconds(0);
      currentTime.setMilliseconds(0);

      if (skipWeekends) {
        while (currentTime.getDay() === 0 || currentTime.getDay() === 6) {
          currentTime.setDate(currentTime.getDate() + 1);
        }
      }

      if (currentTime > endDate) {
        break;
      }

      slot = getNextAvailableSlot(
        currentTime.getTime(),
        config,
        task.id,
        sortedExistingEvents,
        remainingMinutes
      );
    }

    if (!slot) {
      break;
    }

    events.push(slot);

    const slotDurationMinutes = Math.round(
      (slot.end_time.getTime() - slot.start_time.getTime()) / (1000 * 60)
    );
    remainingMinutes = Math.max(0, remainingMinutes - slotDurationMinutes);

    // Add this event to sorted list for subsequent slots
    const newEventRange = {
      start: slot.start_time.getTime(),
      end: slot.end_time.getTime(),
    };
    sortedExistingEvents.push(newEventRange);
    sortedExistingEvents.sort((a, b) => a.start - b.start);

    // Move current time to end of this event + gap for next event
    currentTime = new Date(slot.end_time.getTime() + gapMs);
  }

  return events;
}

/**
 * Compare two tasks by due_date (nulls last), then by priority (high first).
 */
function compareByDateAndPriority(a: Task, b: Task): number {
  if (a.due_date && !b.due_date) return -1;
  if (!a.due_date && b.due_date) return 1;
  if (a.due_date && b.due_date) {
    const dateDiff = a.due_date.getTime() - b.due_date.getTime();
    if (dateDiff !== 0) return dateDiff;
  }

  return (
    (TASK_PRIORITY_RANK[b.priority] ?? 0) -
    (TASK_PRIORITY_RANK[a.priority] ?? 0)
  );
}

/**
 * Topological sort that respects blockedBy dependencies.
 *
 * Uses Kahn's algorithm: tasks whose blockers have all been placed are
 * emitted first. Within each "wave" of unblocked tasks, the existing
 * date/priority comparator decides the order.
 *
 * Handles cycles / missing refs gracefully — any tasks that can't be
 * resolved are appended at the end sorted by date/priority.
 */
function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Build in-degree map (only count blockers that are in the current set)
  const inDegree = new Map<string, number>();
  // Map from blocker id → tasks it unblocks
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    const blockers = (task.blockedBy ?? []).filter(id => taskMap.has(id));
    inDegree.set(task.id, blockers.length);
    for (const blockerId of blockers) {
      const list = dependents.get(blockerId) ?? [];
      list.push(task.id);
      dependents.set(blockerId, list);
    }
  }

  // Seed the queue with tasks that have no blockers in the set
  const queue: Task[] = tasks
    .filter(t => (inDegree.get(t.id) ?? 0) === 0)
    .sort(compareByDateAndPriority);

  const result: Task[] = [];
  const placed = new Set<string>();

  while (queue.length > 0) {
    const task = queue.shift()!;
    if (placed.has(task.id)) continue;

    result.push(task);
    placed.add(task.id);

    // Collect all newly unblocked tasks, then sort the batch
    const newlyReady: Task[] = [];
    for (const depId of dependents.get(task.id) ?? []) {
      const newDeg = (inDegree.get(depId) ?? 1) - 1;
      inDegree.set(depId, newDeg);
      if (newDeg === 0 && !placed.has(depId)) {
        const depTask = taskMap.get(depId);
        if (depTask) newlyReady.push(depTask);
      }
    }

    if (newlyReady.length > 0) {
      newlyReady.sort(compareByDateAndPriority);
      // Merge into queue maintaining sort order
      queue.push(...newlyReady);
      queue.sort(compareByDateAndPriority);
    }
  }

  // Append any remaining tasks (cycles or orphaned refs) sorted normally
  if (placed.size < tasks.length) {
    const remaining = tasks
      .filter(t => !placed.has(t.id))
      .sort(compareByDateAndPriority);
    result.push(...remaining);
  }

  return result;
}

/**
 * Sort tasks for scheduling: respects blockedBy dependencies first,
 * then by due_date (nulls last), then by priority.
 */
export function sortTasksForScheduling(
  tasks: Task[],
  config: TaskSchedulingConfig = DEFAULT_CONFIG
): Task[] {
  const sortStrategy = config.sortStrategy || topologicalSort;
  return sortStrategy([...tasks]);
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
  const remainingMinutes = calculateRemainingDurationMinutes(
    task,
    existingTaskEvents,
    config
  );
  const events = distributeEvents(
    task,
    remainingMinutes,
    config,
    allExistingEvents,
    startFrom
  );
  const violations = checkDeadlineViolations(events, task);

  return { events, violations };
}
