import { describe, expect, it } from '@jest/globals';
import type { Task, Schedule } from '../../types/database.js';
import {
  createConfigFromSchedule,
  distributeEvents,
} from '../taskScheduler.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: '',
    due_date: new Date('2026-03-05T00:00:00.000Z'),
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date('2026-03-01T10:00:00.000Z'),
    updated_at: new Date('2026-03-01T10:00:00.000Z'),
    planned_duration_minutes: 30,
    actual_duration_minutes: 0,
    schedule_id: 'sched-1',
    start_date: null,
    is_recurring: false,
    recurrence_pattern: undefined,
    recurrence_interval: 1,
    recurrence_start_date: null,
    next_generation_cutoff: null,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    name: 'Monday-only',
    working_hours_start: 9,
    working_hours_end: 18,
    // Only Monday is a working day; due date below is Thursday.
    working_days: {
      0: null,
      1: { start: 9, end: 18 },
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    },
    is_default: true,
    created_at: new Date('2026-03-01T00:00:00.000Z'),
    updated_at: new Date('2026-03-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('taskScheduler due-date fallback behavior', () => {
  it('schedules overdue when no in-window slot exists for task schedule', () => {
    const task = makeTask();
    const schedule = makeSchedule();
    const config = createConfigFromSchedule(schedule, 60);

    // Start on due-date morning (Thursday), but schedule allows only Mondays.
    const startFrom = new Date('2026-03-05T09:00:00.000Z');

    const events = distributeEvents(task, 30, config, [], startFrom);

    expect(events.length).toBeGreaterThan(0);
    // First Monday after due date is 2026-03-09.
    expect(events[0]?.start_time.toISOString().startsWith('2026-03-09')).toBe(
      true
    );
  });
});
