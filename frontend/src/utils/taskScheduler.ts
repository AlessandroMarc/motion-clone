import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
  DayOfWeek,
  DaySchedule,
} from '@/types';
import { TASK_PRIORITY_RANK } from '@/utils/taskUtils';
import {
  generateOccurrenceDates,
  get90DayHorizon,
} from '@/utils/recurrenceCalculator';

export interface TaskSchedulingConfig {
  eventDurationMinutes: number;
  workingHoursStart: number; // 9
  workingHoursEnd: number; // 22
  workingDays?: Record<DayOfWeek, DaySchedule | null>; // per-day overrides; when set, takes precedence over workingHoursStart/End and skipWeekends
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
    workingDays: schedule?.working_days ?? undefined,
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
 * Return the working hours for a given day-of-week according to the config.
 * Returns null when the day is not a working day.
 * Falls back to global workingHoursStart/End (respecting skipWeekends) when
 * workingDays is not configured or when a specific day key is missing.
 */
export function getDayWorkingHours(
  config: TaskSchedulingConfig,
  dayOfWeek: number
): DaySchedule | null {
  if (config.workingDays) {
    // Check if this specific day is configured in workingDays
    const day = dayOfWeek as DayOfWeek;
    if (day in config.workingDays) {
      // Return the value (could be null for non-working days or a DaySchedule)
      return config.workingDays[day];
    }
    // Day key is missing in workingDays - fall back to legacy behavior
  }
  // Legacy: use global hours, optionally skipping weekends
  if (config.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return null;
  }
  return { start: config.workingHoursStart, end: config.workingHoursEnd };
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
  const dayOfWeek = dateObj.getDay();
  const dayHours = getDayWorkingHours(config, dayOfWeek);

  // No working hours on this day
  if (!dayHours) return null;

  dateObj.setHours(dayHours.end, 0, 0, 0);
  const endOfDay = dateObj.getTime();

  // Ensure we're within working hours
  const workingStartObj = new Date(startFrom);
  workingStartObj.setHours(dayHours.start, 0, 0, 0);
  const workingStart = workingStartObj.getTime();

  if (currentTime < workingStart) {
    currentTime = workingStart;
  }

  if (currentTime >= endOfDay) {
    return null;
  }

  const gapMs = (config.gapBetweenEventsMinutes ?? 5) * 60 * 1000;
  const minBlockMs = (config.minBlockMinutes ?? 15) * 60 * 1000;
  const duration60min = config.eventDurationMinutes * 60 * 1000;

  // Helper: check if a proposed slot overlaps with any existing event
  const wouldOverlap = (slotStart: number, slotEnd: number): boolean => {
    return sortedExistingEvents.some(
      e => slotStart < e.end && slotEnd > e.start
    );
  };

  // Filter events that might affect today's schedule
  const relevantEvents = sortedExistingEvents.filter(
    e => e.start < endOfDay && e.end > workingStart
  );

  // Build gaps explicitly
  const gaps: Array<{ start: number; end: number }> = [];

  if (relevantEvents.length === 0) {
    // Whole day is free
    gaps.push({ start: currentTime, end: endOfDay });
  } else {
    // Sort events by start time
    const sorted = [...relevantEvents].sort((a, b) => a.start - b.start);

    // Gap at beginning of day
    if (sorted[0].start > currentTime) {
      gaps.push({
        start: Math.max(currentTime, workingStart),
        end: sorted[0].start,
      });
    }

    // Gaps between events
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].end + gapMs;
      const gapEnd = sorted[i + 1].start;
      if (gapStart < gapEnd) {
        gaps.push({ start: gapStart, end: gapEnd });
      }
    }

    // Gap at end of day
    const lastEvent = sorted[sorted.length - 1];
    const gapStart = lastEvent.end + gapMs;
    if (gapStart < endOfDay) {
      gaps.push({ start: gapStart, end: endOfDay });
    }
  }

  // Find first gap that can fit our event
  for (const gap of gaps) {
    // Skip gaps entirely before current time
    if (gap.end <= currentTime) continue;

    const gapStart = Math.max(gap.start, currentTime);
    const availableMs = gap.end - gapStart;

    if (availableMs >= minBlockMs) {
      const durationMs = Math.min(
        duration60min,
        remainingMinutes * 60 * 1000,
        availableMs
      );
      const slotStart = gapStart;
      const slotEnd = gapStart + durationMs;

      // Final safety check: ensure no overlap
      if (!wouldOverlap(slotStart, slotEnd)) {
        return {
          task_id: taskId,
          start_time: new Date(slotStart),
          end_time: new Date(slotEnd),
        };
      } else {
        console.warn(
          `[OVERLAP:safety] Proposed slot still overlaps after gap calculation!`,
          {
            gap,
            slotStart: new Date(slotStart),
            slotEnd: new Date(slotEnd),
            taskId,
          }
        );
      }
    }
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
    const todayDayHours = getDayWorkingHours(config, now.getDay());
    const startHour = todayDayHours
      ? todayDayHours.start
      : config.workingHoursStart;
    const workingHoursStart = new Date(now);
    workingHoursStart.setHours(startHour, 0, 0, 0);
    workingHoursStart.setSeconds(0);
    workingHoursStart.setMilliseconds(0);
    // Use the later of: working hours start or current time (rounded)
    currentTime =
      roundedNow > workingHoursStart ? roundedNow : workingHoursStart;
  }

  // Respect start_date: don't schedule before the task's earliest allowed date
  if (task.start_date) {
    const startDateWorkingHours = new Date(task.start_date);
    startDateWorkingHours.setHours(config.workingHoursStart, 0, 0, 0);
    if (currentTime < startDateWorkingHours) {
      currentTime = startDateWorkingHours;
    }
  }

  // Determine end date
  let endDate: Date;
  const dueDate = task.due_date;
  const hasDueDate = !!dueDate;
  if (dueDate) {
    endDate = new Date(dueDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Use default days from effective scheduling start (after start_date clamp)
    const horizonStart = new Date(currentTime);
    horizonStart.setHours(0, 0, 0, 0);
    endDate = new Date(horizonStart);
    endDate.setDate(
      endDate.getDate() + (config.defaultDaysWithoutDeadline || 14)
    );
    endDate.setHours(23, 59, 59, 999);
  }

  // Ensure end date is not before current time (due_date path only)
  if (hasDueDate && endDate < currentTime) {
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

  // Helper: check if a time range overlaps with ANY existing event
  const hasOverlap = (start: number, end: number): boolean => {
    return sortedExistingEvents.some(e => start < e.end && end > e.start);
  };

  while (remainingMinutes > 0) {
    // Get next available slot starting from current time
    let slot = getNextAvailableSlot(
      currentTime.getTime(),
      config,
      task.id,
      sortedExistingEvents,
      remainingMinutes
    );

    // Validate that slot doesn't overlap (belt-and-suspenders check)
    if (
      slot &&
      hasOverlap(slot.start_time.getTime(), slot.end_time.getTime())
    ) {
      const slotStartMs = slot.start_time.getTime();
      const slotEndMs = slot.end_time.getTime();
      console.warn(
        `[OVERLAP:detect] WARNING: slot ${slot.start_time.toISOString()}-${slot.end_time.toISOString()} overlaps!`,
        {
          taskId: task.id,
          taskTitle: task.title,
          slotStart: new Date(slotStartMs),
          slotEnd: new Date(slotEndMs),
          eventCount: sortedExistingEvents.length,
          overlappingEvents: sortedExistingEvents.filter(
            e => slotStartMs < e.end && slotEndMs > e.start
          ),
        }
      );
      // Skip this bad slot and move to end of day
      currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);
      if (currentTime.getHours() >= config.workingHoursEnd) {
        slot = null;
      }
    }

    // If no slot available today, advance day-by-day until we find one or pass endDate
    let daysSearched = 0;
    const MAX_DAYS = 365; // Don't search infinitely

    while (!slot && daysSearched < MAX_DAYS) {
      daysSearched++;
      currentTime.setDate(currentTime.getDate() + 1);
      const nextDayHours = getDayWorkingHours(config, currentTime.getDay());
      const startHour = nextDayHours
        ? nextDayHours.start
        : config.workingHoursStart;
      currentTime.setHours(startHour, 0, 0, 0);
      currentTime.setMinutes(0);
      currentTime.setSeconds(0);
      currentTime.setMilliseconds(0);

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

      // Re-validate for new day too
      if (
        slot &&
        hasOverlap(slot.start_time.getTime(), slot.end_time.getTime())
      ) {
        console.warn(
          `[OVERLAP:detect] WARNING: day-advance slot overlaps too!`,
          {
            taskId: task.id,
            date: currentTime.toDateString(),
          }
        );
        slot = null;
      }
    }

    if (!slot) {
      break;
    }

    events.push(slot);
    const slotStart = slot.start_time.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    const slotEnd = slot.end_time.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    console.log(
      `[DISTRIBUTE:slot] task="${task.title}" event #${events.length} ${slotStart}-${slotEnd} (remaining=${remainingMinutes}min, accumulated=${sortedExistingEvents.length} events)`
    );

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
 * Check if events overlap with each other or with provided existing events.
 * Returns the list of events that have overlaps.
 */
export function checkEventOverlaps(
  events: ScheduledEvent[],
  existingEvents?: CalendarEventUnion[]
): ScheduledEvent[] {
  const allEvents = [
    ...events.map(e => ({
      start: e.start_time.getTime(),
      end: e.end_time.getTime(),
      source: 'proposed' as const,
    })),
    ...(existingEvents ?? []).map(e => ({
      start: new Date(e.start_time).getTime(),
      end: new Date(e.end_time).getTime(),
      source: 'existing' as const,
    })),
  ];

  const overlappingProposed = new Set<number>();

  // Check each proposed event against all others
  for (let i = 0; i < events.length; i++) {
    const proposedMs = {
      start: events[i].start_time.getTime(),
      end: events[i].end_time.getTime(),
    };

    for (let j = 0; j < allEvents.length; j++) {
      if (
        i === j && // Don't compare with itself
        allEvents[j].source === 'proposed'
      ) {
        continue;
      }

      const other = allEvents[j];
      // Check if ranges overlap: start < other.end AND end > other.start
      if (proposedMs.start < other.end && proposedMs.end > other.start) {
        overlappingProposed.add(i);
        break;
      }
    }
  }

  return events.filter((_, i) => overlappingProposed.has(i));
}

/**
 * Schedule one event per occurrence for a recurring task over the 90-day horizon.
 * Each occurrence gets exactly `planned_duration_minutes` minutes.
 *
 * KEY INVARIANT: every occurrence date that already has a real (persisted)
 * calendar event is RE-INCLUDED in the return value with the SAME slot times.
 * This ensures the proposed schedule always has exactly N events (one per
 * occurrence), so `isSameSchedule` and `applySchedule` see a stable schedule
 * and never delete-all-then-recreate on every run.
 *
 * @param existingTaskEvents - Real (non-synthetic) events already in the DB
 *   for this task. Used for deduplication AND for re-claiming slots.
 * @param allExistingEvents - All events (for slot-overlap avoidance on new dates).
 */
function prepareRecurringTaskEvents(
  task: Task,
  existingTaskEvents: CalendarEventTask[],
  allExistingEvents: CalendarEventUnion[],
  config: TaskSchedulingConfig = DEFAULT_CONFIG
): {
  events: ScheduledEvent[];
  violations: ScheduledEvent[];
} {
  const occurrenceDurationMinutes =
    task.planned_duration_minutes && task.planned_duration_minutes > 0
      ? task.planned_duration_minutes
      : DEFAULT_CONFIG.eventDurationMinutes;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Anchor: day-of-week / day-of-month is determined by recurrence_start_date
  const anchor = task.recurrence_start_date
    ? new Date(task.recurrence_start_date)
    : today;
  anchor.setHours(0, 0, 0, 0);

  const allOccurrenceDates = generateOccurrenceDates(
    anchor,
    task.recurrence_pattern!,
    task.recurrence_interval || 1,
    get90DayHorizon()
  );
  const occurrenceDates = allOccurrenceDates.filter(d => d >= today);

  // Build dateString → first existing event map (one per date, deduplicates).
  const existingByDate = new Map<string, CalendarEventTask>();
  for (const e of existingTaskEvents) {
    const ds = new Date(e.start_time).toDateString();
    if (!existingByDate.has(ds)) {
      existingByDate.set(ds, e);
    }
  }

  console.log(
    `[AUTOSCHEDULE:recurring] prepareRecurringTaskEvents task="${task.title}"`,
    {
      anchor: anchor.toDateString(),
      occurrenceCount: occurrenceDates.length,
      occurrences: occurrenceDates.map(d => d.toDateString()),
      existingEventsTotal: existingTaskEvents.length,
      existingUniqueDates: existingByDate.size,
      existingDates: Array.from(existingByDate.keys()),
    }
  );

  // Pre-sort all events for slot-finding (used only for new slots)
  const sortedExisting = allExistingEvents
    .map(e => ({
      start: new Date(e.start_time).getTime(),
      end: new Date(e.end_time).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  const events: ScheduledEvent[] = [];

  for (const occurrenceDate of occurrenceDates) {
    const ds = occurrenceDate.toDateString();
    const existing = existingByDate.get(ds);

    if (existing) {
      // Already persisted → re-include the same slot so the proposed schedule
      // is stable and `applySchedule` sees zero diff for this occurrence.
      const slot: ScheduledEvent = {
        task_id: task.id,
        start_time: new Date(existing.start_time),
        end_time: new Date(existing.end_time),
      };
      events.push(slot);
      console.log(
        `[AUTOSCHEDULE:recurring]   ${ds} → RECLAIMED existing`,
        new Date(existing.start_time).toISOString()
      );
      continue;
    }

    // No persisted event yet → find a fresh slot on that day
    const dayConfig: TaskSchedulingConfig = {
      ...config,
      eventDurationMinutes: occurrenceDurationMinutes,
    };
    const dayOfWeek = occurrenceDate.getDay();
    const dayHours = getDayWorkingHours(dayConfig, dayOfWeek);
    if (!dayHours) {
      // This day is not a working day according to the schedule
      console.warn(`[AUTOSCHEDULE:recurring]   ${ds} → NOT a working day`);
      continue;
    }
    const dayStart = new Date(occurrenceDate);
    dayStart.setHours(dayHours.start, 0, 0, 0);

    const slot = getNextAvailableSlot(
      dayStart.getTime(),
      dayConfig,
      task.id,
      sortedExisting,
      occurrenceDurationMinutes
    );

    if (slot) {
      events.push(slot);
      sortedExisting.push({
        start: slot.start_time.getTime(),
        end: slot.end_time.getTime(),
      });
      sortedExisting.sort((a, b) => a.start - b.start);
      console.log(
        `[AUTOSCHEDULE:recurring]   ${ds} → NEW slot`,
        slot.start_time.toISOString()
      );
    } else {
      console.warn(`[AUTOSCHEDULE:recurring]   ${ds} → NO slot available`);
    }
  }

  console.log(
    `[AUTOSCHEDULE:recurring] result: ${events.length} proposed for ${occurrenceDates.length} occurrences`
  );
  return { events, violations: [] };
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
  // Recurring tasks: one event per occurrence, not a duration-filling budget
  if (task.is_recurring && task.recurrence_pattern) {
    return prepareRecurringTaskEvents(
      task,
      existingTaskEvents,
      allExistingEvents,
      config
    );
  }

  const remainingMinutes = calculateRemainingDurationMinutes(
    task,
    existingTaskEvents,
    config
  );

  if (remainingMinutes > 0) {
    console.log(
      `[SCHEDULE:task] "${task.title}" remaining=${remainingMinutes} existing=${allExistingEvents.length}`
    );
  }

  const events = distributeEvents(
    task,
    remainingMinutes,
    config,
    allExistingEvents,
    startFrom
  );

  // Check both deadline violations AND time overlaps
  const deadlineViolations = checkDeadlineViolations(events, task);
  const overlapViolations = checkEventOverlaps(events, allExistingEvents);

  // Combine violations, avoiding duplicates
  const violationSet = new Set<number>();

  deadlineViolations.forEach(ev => {
    const idx = events.indexOf(ev);
    if (idx >= 0) violationSet.add(idx);
  });

  overlapViolations.forEach(ev => {
    const idx = events.indexOf(ev);
    if (idx >= 0) violationSet.add(idx);
  });

  const violations = Array.from(violationSet).map(idx => events[idx]);

  return { events, violations };
}
