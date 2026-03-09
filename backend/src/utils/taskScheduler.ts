/**
 * Task scheduling utilities — backend port of frontend/src/utils/taskScheduler.ts
 * Handles slot-finding, event distribution and sort logic.
 */

import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
  DayOfWeek,
  DaySchedule,
} from '../types/database.js';
import {
  generateOccurrenceDates,
  get90DayHorizon,
} from './recurrenceCalculator.js';

// ---------------------------------------------------------------------------
// Priority rank (mirrors frontend/src/utils/taskUtils.ts)
// ---------------------------------------------------------------------------
const TASK_PRIORITY_RANK: Record<'low' | 'medium' | 'high', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TaskSchedulingConfig {
  eventDurationMinutes: number;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingDays?: Record<DayOfWeek, DaySchedule | null>;
  skipWeekends?: boolean;
  sortStrategy?: (tasks: Task[]) => Task[];
  defaultDaysWithoutDeadline?: number;
  minBlockMinutes?: number;
  gapBetweenEventsMinutes?: number;
}

export const DEFAULT_CONFIG: TaskSchedulingConfig = {
  eventDurationMinutes: 60,
  workingHoursStart: 9,
  workingHoursEnd: 18,
  skipWeekends: false,
  defaultDaysWithoutDeadline: 14,
  minBlockMinutes: 15,
  gapBetweenEventsMinutes: 5,
};

export function createConfigFromSchedule(
  schedule: Schedule | null,
  eventDurationMinutes = 60
): TaskSchedulingConfig {
  const config: TaskSchedulingConfig = {
    ...DEFAULT_CONFIG,
    eventDurationMinutes,
    workingHoursStart:
      schedule?.working_hours_start ?? DEFAULT_CONFIG.workingHoursStart,
    workingHoursEnd:
      schedule?.working_hours_end ?? DEFAULT_CONFIG.workingHoursEnd,
  };
  if (schedule?.working_days) {
    config.workingDays = schedule.working_days;
  }
  return config;
}

export interface ScheduledEvent {
  task_id: string;
  start_time: Date;
  end_time: Date;
}

// ---------------------------------------------------------------------------
// Working hours helpers
// ---------------------------------------------------------------------------

export function getDayWorkingHours(
  config: TaskSchedulingConfig,
  dayOfWeek: number
): DaySchedule | null {
  if (config.workingDays) {
    const day = dayOfWeek as DayOfWeek;
    if (day in config.workingDays) {
      return config.workingDays[day] ?? null;
    }
  }
  if (config.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return null;
  }
  return { start: config.workingHoursStart, end: config.workingHoursEnd };
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

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

  return remainingDuration === 0 && planned === 0
    ? config.eventDurationMinutes
    : remainingDuration;
}

// ---------------------------------------------------------------------------
// Parse a date-only string (YYYY-MM-DD) in local time.
// new Date("2026-03-10") parses as UTC midnight, which in UTC+1 becomes
// March 9 at 23:00 local — one day early. Splitting avoids that.
// ---------------------------------------------------------------------------

export function parseDateLocal(date: string | Date): Date {
  if (date instanceof Date) return date;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

// ---------------------------------------------------------------------------
// Round to next 15 minutes
// ---------------------------------------------------------------------------

function roundToNext15Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;

  if (remainder === 0) {
    rounded.setMinutes(minutes + 15);
  } else {
    rounded.setMinutes(minutes + (15 - remainder));
  }

  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

// ---------------------------------------------------------------------------
// Slot finder
// ---------------------------------------------------------------------------

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

  if (!dayHours) return null;

  dateObj.setHours(dayHours.end, 0, 0, 0);
  const endOfDay = dateObj.getTime();

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

  const wouldOverlap = (slotStart: number, slotEnd: number): boolean => {
    return sortedExistingEvents.some(
      e => slotStart < e.end && slotEnd > e.start
    );
  };

  const relevantEvents = sortedExistingEvents.filter(
    e => e.start < endOfDay && e.end > workingStart
  );

  const gaps: Array<{ start: number; end: number }> = [];

  if (relevantEvents.length === 0) {
    gaps.push({ start: currentTime, end: endOfDay });
  } else {
    // Merge overlapping/adjacent events before computing gaps so that
    // e.g. [train 06:10–09:25] + [study 07:00–09:00] merge to [06:10–09:25]
    // instead of producing a phantom gap at 09:05 that is still inside the train.
    const sorted = [...relevantEvents].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [];
    for (const e of sorted) {
      const last = merged[merged.length - 1];
      if (!last || e.start > last.end) {
        merged.push({ start: e.start, end: e.end });
      } else {
        last.end = Math.max(last.end, e.end);
      }
    }

    const firstMerged = merged[0];
    const lastMerged = merged[merged.length - 1];

    if (firstMerged && firstMerged.start > currentTime) {
      gaps.push({
        start: Math.max(currentTime, workingStart),
        end: firstMerged.start,
      });
    }

    for (let i = 0; i < merged.length - 1; i++) {
      const cur = merged[i];
      const next = merged[i + 1];
      if (cur && next) {
        const gapStart = cur.end + gapMs;
        const gapEnd = next.start;
        if (gapStart < gapEnd) {
          gaps.push({ start: gapStart, end: gapEnd });
        }
      }
    }

    if (lastMerged) {
      const gapStart = lastMerged.end + gapMs;
      if (gapStart < endOfDay) {
        gaps.push({ start: gapStart, end: endOfDay });
      }
    }
  }

  for (const gap of gaps) {
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

      if (!wouldOverlap(slotStart, slotEnd)) {
        return {
          task_id: taskId,
          start_time: new Date(slotStart),
          end_time: new Date(slotEnd),
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// distributeEvents
// ---------------------------------------------------------------------------

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
    currentTime =
      roundedNow > workingHoursStart ? roundedNow : workingHoursStart;
  }

  if (task.start_date) {
    const startDateWorkingHours = parseDateLocal(task.start_date as string | Date);
    startDateWorkingHours.setHours(config.workingHoursStart, 0, 0, 0);
    if (currentTime < startDateWorkingHours) {
      currentTime = startDateWorkingHours;
    }
  }

  let endDate: Date;
  const dueDate = task.due_date;
  const hasDueDate = !!dueDate;
  if (dueDate) {
    endDate = new Date(dueDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    const horizonStart = new Date(currentTime);
    horizonStart.setHours(0, 0, 0, 0);
    endDate = new Date(horizonStart);
    endDate.setDate(
      endDate.getDate() + (config.defaultDaysWithoutDeadline || 14)
    );
    endDate.setHours(23, 59, 59, 999);
  }

  if (hasDueDate && endDate < currentTime) {
    endDate = new Date(currentTime);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  }

  const events: ScheduledEvent[] = [];
  const gapMs = (config.gapBetweenEventsMinutes ?? 5) * 60 * 1000;
  let extendedDueDateWindow = false;

  const sortedExistingEvents: TimeRange[] = allExistingEvents
    .map(e => ({
      start: new Date(e.start_time).getTime(),
      end: new Date(e.end_time).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  const hasOverlap = (start: number, end: number): boolean => {
    return sortedExistingEvents.some(e => start < e.end && end > e.start);
  };

  while (remainingMinutes > 0) {
    let slot = getNextAvailableSlot(
      currentTime.getTime(),
      config,
      task.id,
      sortedExistingEvents,
      remainingMinutes
    );

    if (
      slot &&
      hasOverlap(slot.start_time.getTime(), slot.end_time.getTime())
    ) {
      currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);
      const todayHours = getDayWorkingHours(config, currentTime.getDay());
      const endHour = todayHours ? todayHours.end : config.workingHoursEnd;
      if (currentTime.getHours() >= endHour) {
        slot = null;
      }
    }

    let daysSearched = 0;
    const MAX_DAYS = 365;

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
        // If a due-date task cannot find any in-window slot (for example,
        // restrictive working days/hours), extend once so it is still
        // scheduled as overdue instead of disappearing from the calendar.
        if (hasDueDate && !extendedDueDateWindow) {
          const extensionDays = config.defaultDaysWithoutDeadline || 14;
          endDate = new Date(currentTime);
          endDate.setDate(endDate.getDate() + extensionDays);
          endDate.setHours(23, 59, 59, 999);
          extendedDueDateWindow = true;
        } else {
          break;
        }
      }

      slot = getNextAvailableSlot(
        currentTime.getTime(),
        config,
        task.id,
        sortedExistingEvents,
        remainingMinutes
      );

      if (
        slot &&
        hasOverlap(slot.start_time.getTime(), slot.end_time.getTime())
      ) {
        slot = null;
      }
    }

    if (!slot) {
      break;
    }

    events.push(slot);

    const slotDurationMinutes = Math.round(
      (slot.end_time.getTime() - slot.start_time.getTime()) / (1000 * 60)
    );
    remainingMinutes = Math.max(0, remainingMinutes - slotDurationMinutes);

    const newEventRange = {
      start: slot.start_time.getTime(),
      end: slot.end_time.getTime(),
    };
    sortedExistingEvents.push(newEventRange);
    sortedExistingEvents.sort((a, b) => a.start - b.start);

    currentTime = new Date(slot.end_time.getTime() + gapMs);
  }

  return events;
}

// ---------------------------------------------------------------------------
// Deadline / overlap checks
// ---------------------------------------------------------------------------

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

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    const proposedMs = {
      start: ev.start_time.getTime(),
      end: ev.end_time.getTime(),
    };

    for (let j = 0; j < allEvents.length; j++) {
      const other = allEvents[j];
      if (!other) continue;
      if (i === j && other.source === 'proposed') {
        continue;
      }

      if (proposedMs.start < other.end && proposedMs.end > other.start) {
        overlappingProposed.add(i);
        break;
      }
    }
  }

  return events.filter((_, i) => overlappingProposed.has(i));
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function compareByDateAndPriority(a: Task, b: Task): number {
  if (a.due_date && !b.due_date) return -1;
  if (!a.due_date && b.due_date) return 1;
  if (a.due_date && b.due_date) {
    const dateDiff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (dateDiff !== 0) return dateDiff;
  }

  return (
    (TASK_PRIORITY_RANK[b.priority] ?? 0) -
    (TASK_PRIORITY_RANK[a.priority] ?? 0)
  );
}

function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  const inDegree = new Map<string, number>();
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

  const queue: Task[] = tasks
    .filter(t => (inDegree.get(t.id) ?? 0) === 0)
    .sort(compareByDateAndPriority);

  const result: Task[] = [];
  const placed = new Set<string>();

  while (queue.length > 0) {
    const task = queue.shift();
    if (!task || placed.has(task.id)) continue;

    result.push(task);
    placed.add(task.id);

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
      queue.push(...newlyReady);
      queue.sort(compareByDateAndPriority);
    }
  }

  if (placed.size < tasks.length) {
    const remaining = tasks
      .filter(t => !placed.has(t.id))
      .sort(compareByDateAndPriority);
    result.push(...remaining);
  }

  return result;
}

export function sortTasksForScheduling(
  tasks: Task[],
  config: TaskSchedulingConfig = DEFAULT_CONFIG
): Task[] {
  const sortStrategy = config.sortStrategy || topologicalSort;
  return sortStrategy([...tasks]);
}

// ---------------------------------------------------------------------------
// Recurring task event preparation
// ---------------------------------------------------------------------------

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

  const existingByDate = new Map<string, CalendarEventTask>();
  for (const e of existingTaskEvents) {
    const ds = new Date(e.start_time).toDateString();
    if (!existingByDate.has(ds)) {
      existingByDate.set(ds, e);
    }
  }

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

    // Skip days that already have an event — they're handled by the caller
    // via lockedFutureEvents. Returning them here would create duplicates.
    if (existing) {
      continue;
    }

    const dayConfig: TaskSchedulingConfig = {
      ...config,
      eventDurationMinutes: occurrenceDurationMinutes,
    };
    const dayOfWeek = occurrenceDate.getDay();
    const dayHours = getDayWorkingHours(dayConfig, dayOfWeek);
    if (!dayHours) {
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
    }
  }

  return { events, violations: [] };
}

// ---------------------------------------------------------------------------
// prepareTaskEvents — public API
// ---------------------------------------------------------------------------

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

  const events = distributeEvents(
    task,
    remainingMinutes,
    config,
    allExistingEvents,
    startFrom
  );

  const deadlineViolations = checkDeadlineViolations(events, task);
  const overlapViolations = checkEventOverlaps(events, allExistingEvents);

  const violationSet = new Set<number>();

  deadlineViolations.forEach(ev => {
    const idx = events.indexOf(ev);
    if (idx >= 0) violationSet.add(idx);
  });

  overlapViolations.forEach(ev => {
    const idx = events.indexOf(ev);
    if (idx >= 0) violationSet.add(idx);
  });

  const violations: ScheduledEvent[] = Array.from(violationSet)
    .map(idx => events[idx])
    .filter((ev): ev is ScheduledEvent => ev !== undefined);

  return { events, violations };
}
