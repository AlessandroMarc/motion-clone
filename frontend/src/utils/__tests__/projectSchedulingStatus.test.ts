import type { Task, CalendarEventTask, CalendarEventUnion } from '@/types';
import { checkProjectSchedulingStatus } from '../projectSchedulingStatus';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  ...overrides,
});

let eventCounter = 0;
const makeTaskEvent = (
  taskId: string,
  startTime: Date,
  endTime: Date,
  completedAt: Date | null = null
): CalendarEventTask => ({
  id: `event-${++eventCounter}`,
  title: 'Event',
  start_time: startTime,
  end_time: endTime,
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  linked_task_id: taskId,
  completed_at: completedAt,
});

// Helper to build a start/end pair relative to now
const hoursFromNow = (h: number) => {
  const d = new Date();
  d.setHours(d.getHours() + h, 0, 0, 0);
  return d;
};

describe('checkProjectSchedulingStatus', () => {
  // ─── Empty / all-completed projects ──────────────────────────────────────────

  it('returns allTasksScheduled:false when there are no tasks', () => {
    const result = checkProjectSchedulingStatus([], []);
    expect(result.allTasksScheduled).toBe(false);
  });

  it('returns zero counts when there are no tasks', () => {
    const result = checkProjectSchedulingStatus([], []);
    expect(result.incompleteTasksCount).toBe(0);
    expect(result.totalTasksCount).toBe(0);
    expect(result.scheduledTasksCount).toBe(0);
  });

  it('returns allTasksScheduled:false when all tasks are completed', () => {
    const tasks = [makeTask({ status: 'completed' })];
    const result = checkProjectSchedulingStatus(tasks, []);
    expect(result.allTasksScheduled).toBe(false);
    expect(result.incompleteTasksCount).toBe(0);
  });

  it('counts completed tasks in totalTasksCount but not incompleteTasksCount', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'completed' }),
      makeTask({ id: 't2', status: 'not-started' }),
    ];
    const result = checkProjectSchedulingStatus(tasks, []);
    expect(result.totalTasksCount).toBe(2);
    expect(result.incompleteTasksCount).toBe(1);
  });

  // ─── Scheduling coverage ─────────────────────────────────────────────────────

  it('reports scheduledTasksCount:0 when a task has no events', () => {
    const task = makeTask({ id: 't1', planned_duration_minutes: 60 });
    const result = checkProjectSchedulingStatus([task], []);
    expect(result.scheduledTasksCount).toBe(0);
    expect(result.allTasksScheduled).toBe(false);
  });

  it('marks a task fully scheduled when events cover its remaining duration', () => {
    const task = makeTask({
      id: 't1',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const start = hoursFromNow(1);
    const end = hoursFromNow(2); // 60-minute event
    const event = makeTaskEvent('t1', start, end);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.scheduledTasksCount).toBe(1);
    expect(result.allTasksScheduled).toBe(true);
  });

  it('marks a task not fully scheduled when events cover less than remaining duration', () => {
    const task = makeTask({
      id: 't1',
      planned_duration_minutes: 120,
      actual_duration_minutes: 0,
    });
    const start = hoursFromNow(1);
    const end = hoursFromNow(2); // only 60 minutes scheduled
    const event = makeTaskEvent('t1', start, end);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.scheduledTasksCount).toBe(0);
    expect(result.allTasksScheduled).toBe(false);
  });

  it('accounts for actual_duration when computing remaining duration', () => {
    // planned=90, actual=30 → remaining=60; one 60-min event → fully scheduled
    const task = makeTask({
      id: 't1',
      planned_duration_minutes: 90,
      actual_duration_minutes: 30,
    });
    const start = hoursFromNow(1);
    const end = hoursFromNow(2);
    const event = makeTaskEvent('t1', start, end);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.scheduledTasksCount).toBe(1);
  });

  it('does not count completed events toward scheduled duration', () => {
    const task = makeTask({
      id: 't1',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const start = hoursFromNow(1);
    const end = hoursFromNow(2);
    const event = makeTaskEvent('t1', start, end, new Date()); // completed
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.scheduledTasksCount).toBe(0);
  });

  it('returns allTasksScheduled:true when all incomplete tasks are fully scheduled', () => {
    const t1 = makeTask({
      id: 't1',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const t2 = makeTask({
      id: 't2',
      planned_duration_minutes: 30,
      actual_duration_minutes: 0,
    });
    const e1 = makeTaskEvent('t1', hoursFromNow(1), hoursFromNow(2));
    const e2 = makeTaskEvent(
      't2',
      hoursFromNow(3),
      new Date(hoursFromNow(3).getTime() + 30 * 60000)
    );
    const result = checkProjectSchedulingStatus(
      [t1, t2],
      [e1 as CalendarEventUnion, e2 as CalendarEventUnion]
    );
    expect(result.allTasksScheduled).toBe(true);
    expect(result.scheduledTasksCount).toBe(2);
  });

  it('returns allTasksScheduled:false when only some tasks are scheduled', () => {
    const t1 = makeTask({
      id: 't1',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const t2 = makeTask({
      id: 't2',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const e1 = makeTaskEvent('t1', hoursFromNow(1), hoursFromNow(2));
    const result = checkProjectSchedulingStatus(
      [t1, t2],
      [e1 as CalendarEventUnion]
    );
    expect(result.allTasksScheduled).toBe(false);
    expect(result.scheduledTasksCount).toBe(1);
  });

  // ─── Deadline violations ──────────────────────────────────────────────────────

  it('reports no deadline violations when task has no due_date', () => {
    const task = makeTask({
      id: 't1',
      due_date: null,
      planned_duration_minutes: 60,
    });
    const event = makeTaskEvent('t1', hoursFromNow(100), hoursFromNow(101));
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.hasDeadlineViolations).toBe(false);
  });

  it('detects a deadline violation when an event starts after the due_date end-of-day', () => {
    const dueDate = new Date('2020-01-01T00:00:00');
    const task = makeTask({
      id: 't1',
      due_date: dueDate,
      planned_duration_minutes: 60,
    });
    // Event starts well after the deadline
    const violatingStart = new Date('2020-01-02T09:00:00');
    const violatingEnd = new Date('2020-01-02T10:00:00');
    const event = makeTaskEvent('t1', violatingStart, violatingEnd);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.hasDeadlineViolations).toBe(true);
    expect(result.allTasksScheduled).toBe(false);
  });

  it('does NOT flag a violation when event is on the deadline day (before 23:59:59.999)', () => {
    const dueDate = new Date('2025-12-31T00:00:00');
    const task = makeTask({
      id: 't1',
      due_date: dueDate,
      planned_duration_minutes: 60,
    });
    const start = new Date('2025-12-31T09:00:00');
    const end = new Date('2025-12-31T10:00:00');
    const event = makeTaskEvent('t1', start, end);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.hasDeadlineViolations).toBe(false);
  });

  it('does not count completed events when checking deadline violations', () => {
    const dueDate = new Date('2020-01-01T00:00:00');
    const task = makeTask({
      id: 't1',
      due_date: dueDate,
      planned_duration_minutes: 60,
    });
    const violatingStart = new Date('2020-01-02T09:00:00');
    const violatingEnd = new Date('2020-01-02T10:00:00');
    const event = makeTaskEvent('t1', violatingStart, violatingEnd, new Date()); // completed
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.hasDeadlineViolations).toBe(false);
  });

  it('allTasksScheduled is false when there are deadline violations even if all tasks have events', () => {
    const dueDate = new Date('2020-01-01T00:00:00');
    const task = makeTask({
      id: 't1',
      due_date: dueDate,
      planned_duration_minutes: 60,
    });
    const violatingStart = new Date('2020-01-02T09:00:00');
    const violatingEnd = new Date('2020-01-02T10:00:00');
    const event = makeTaskEvent('t1', violatingStart, violatingEnd);
    const result = checkProjectSchedulingStatus(
      [task],
      [event as CalendarEventUnion]
    );
    expect(result.allTasksScheduled).toBe(false);
  });

  // ─── Mixed scenarios ──────────────────────────────────────────────────────────

  it('ignores non-task calendar events (no linked_task_id)', () => {
    const task = makeTask({ id: 't1', planned_duration_minutes: 60 });
    // A plain CalendarEvent without linked_task_id should not count
    const plainEvent = {
      id: 'plain-1',
      title: 'Meeting',
      start_time: hoursFromNow(1),
      end_time: hoursFromNow(2),
      user_id: 'user-1',
      created_at: new Date(),
      updated_at: new Date(),
    } as CalendarEventUnion;
    const result = checkProjectSchedulingStatus([task], [plainEvent]);
    expect(result.scheduledTasksCount).toBe(0);
  });

  it('correctly handles multiple tasks with mixed scheduling states', () => {
    const t1 = makeTask({
      id: 't1',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const t2 = makeTask({
      id: 't2',
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
    });
    const t3 = makeTask({ id: 't3', status: 'completed' });
    const e1 = makeTaskEvent('t1', hoursFromNow(1), hoursFromNow(2)); // t1 scheduled
    // t2 has no events
    const result = checkProjectSchedulingStatus(
      [t1, t2, t3],
      [e1 as CalendarEventUnion]
    );
    expect(result.totalTasksCount).toBe(3);
    expect(result.incompleteTasksCount).toBe(2);
    expect(result.scheduledTasksCount).toBe(1);
    expect(result.allTasksScheduled).toBe(false);
  });
});
