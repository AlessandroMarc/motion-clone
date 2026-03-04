import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
} from '@/types';
import {
  calculateAutoSchedule,
  AutoScheduleResult,
} from '../autoScheduleCalculator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function uid(prefix = 'id') {
  return `${prefix}-${++idCounter}`;
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: uid('task'),
    title: 'Test Task',
    description: '',
    due_date: null,
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    planned_duration_minutes: 60,
    actual_duration_minutes: 0,
    is_recurring: false,
    recurrence_interval: 1,
    next_generation_cutoff: null,
    recurrence_start_date: null,
    ...overrides,
  };
}

function createCalendarEvent(
  start: string,
  end: string,
  extra: Partial<CalendarEventUnion> = {}
): CalendarEventUnion {
  return {
    id: uid('evt'),
    title: 'Calendar Event',
    start_time: new Date(start),
    end_time: new Date(end),
    description: '',
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...extra,
  } as CalendarEventUnion;
}

function createTaskEvent(
  taskId: string,
  start: string,
  end: string,
  extra: Partial<CalendarEventTask> = {}
): CalendarEventTask {
  return {
    id: uid('tevt'),
    title: 'Task Event',
    start_time: new Date(start),
    end_time: new Date(end),
    description: '',
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    linked_task_id: taskId,
    completed_at: null,
    ...extra,
  };
}

const defaultSchedule: Schedule = {
  id: 'sched-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 9,
  working_hours_end: 18,
  is_default: true,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

function run(overrides: {
  tasks?: Task[];
  existingEvents?: CalendarEventTask[];
  allCalendarEvents?: CalendarEventUnion[];
  activeSchedule?: Schedule | null;
  eventDuration?: number;
  schedules?: Schedule[];
}): AutoScheduleResult {
  return calculateAutoSchedule({
    tasks: overrides.tasks ?? [],
    existingEvents: overrides.existingEvents ?? [],
    allCalendarEvents: overrides.allCalendarEvents ?? [],
    activeSchedule:
      overrides.activeSchedule !== undefined
        ? overrides.activeSchedule
        : defaultSchedule,
    eventDuration: overrides.eventDuration ?? 60,
    schedules: overrides.schedules ?? [defaultSchedule],
  });
}

/** Check that NO pair of events across ALL tasks overlap */
function assertNoOverlaps(result: AutoScheduleResult) {
  const all: Array<{ taskTitle: string; start: number; end: number }> = [];
  for (const te of result.taskEvents) {
    for (const ev of te.events) {
      all.push({
        taskTitle: te.task.title,
        start: new Date(ev.start_time).getTime(),
        end: new Date(ev.end_time).getTime(),
      });
    }
  }

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.start < b.end && a.end > b.start) {
        fail(
          `Overlap: "${a.taskTitle}" ` +
            `(${new Date(a.start).toISOString()} – ${new Date(a.end).toISOString()}) ↔ ` +
            `"${b.taskTitle}" ` +
            `(${new Date(b.start).toISOString()} – ${new Date(b.end).toISOString()})`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  idCounter = 0;
  // Fix "now" so tests are deterministic
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-08T08:50:00'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('calculateAutoSchedule', () => {
  // ─── Basic behaviour ────────────────────────────────────────────────

  it('returns empty result for no tasks', () => {
    const result = run({ tasks: [] });
    expect(result.taskEvents).toEqual([]);
    expect(result.totalEvents).toBe(0);
    expect(result.totalViolations).toBe(0);
  });

  it('schedules a single task without overlaps', () => {
    const task = createTask({ planned_duration_minutes: 120 });
    const result = run({ tasks: [task] });

    expect(result.taskEvents).toHaveLength(1);
    expect(result.taskEvents[0].events.length).toBeGreaterThan(0);
    assertNoOverlaps(result);
  });

  it('schedules multiple tasks without mutual overlaps', () => {
    const tasks = [
      createTask({ title: 'Alpha', planned_duration_minutes: 60 }),
      createTask({ title: 'Bravo', planned_duration_minutes: 60 }),
      createTask({ title: 'Charlie', planned_duration_minutes: 60 }),
    ];
    const result = run({ tasks });

    expect(result.taskEvents).toHaveLength(3);
    assertNoOverlaps(result);
  });

  it('creates no new events for fully-scheduled task (actual >= planned)', () => {
    const task = createTask({
      planned_duration_minutes: 60,
      actual_duration_minutes: 60,
    });
    const result = run({ tasks: [task] });

    expect(result.taskEvents).toHaveLength(1);
    // 0 new events — already fully done
    expect(result.taskEvents[0].events).toHaveLength(0);
  });

  // ─── Overlap detection on persisted events ──────────────────────────

  describe('overlap detection on existing DB events', () => {
    it('removes overlapping persisted task events and reschedules', () => {
      const taskA = createTask({
        id: 'task-a',
        title: 'Task A',
        planned_duration_minutes: 60,
      });
      const taskB = createTask({
        id: 'task-b',
        title: 'Task B',
        planned_duration_minutes: 60,
      });

      // Simulate overlapping DB events (from a previous buggy run)
      const eventA = createTaskEvent(
        'task-a',
        '2024-01-08T09:15:00',
        '2024-01-08T10:15:00'
      );
      const eventB = createTaskEvent(
        'task-b',
        '2024-01-08T09:45:00',
        '2024-01-08T10:45:00'
      );

      const result = run({
        tasks: [taskA, taskB],
        existingEvents: [eventA, eventB],
        allCalendarEvents: [eventA, eventB],
      });

      assertNoOverlaps(result);

      // Both tasks should have events
      const teA = result.taskEvents.find(t => t.task.id === 'task-a')!;
      const teB = result.taskEvents.find(t => t.task.id === 'task-b')!;
      expect(teA.events.length).toBeGreaterThan(0);
      expect(teB.events.length).toBeGreaterThan(0);
    });

    it('keeps non-overlapping persisted events unchanged', () => {
      const task = createTask({
        id: 'task-keep',
        title: 'Keep',
        planned_duration_minutes: 60,
      });

      // Existing event that does NOT overlap anything else → should be preserved
      const existing = createTaskEvent(
        'task-keep',
        '2024-01-08T09:15:00',
        '2024-01-08T10:15:00'
      );

      const result = run({
        tasks: [task],
        existingEvents: [existing],
        allCalendarEvents: [existing],
      });

      const te = result.taskEvents.find(t => t.task.id === 'task-keep')!;
      expect(te.events).toHaveLength(1);
      // Time should match the original persisted event
      expect(new Date(te.events[0].start_time).toISOString()).toBe(
        new Date('2024-01-08T09:15:00').toISOString()
      );
    });

    it('removes persisted event overlapping a regular calendar event', () => {
      const task = createTask({
        id: 'task-cal',
        title: 'Calendar Clash',
        planned_duration_minutes: 60,
      });

      // Regular (non-task) calendar event occupying 9:30–10:30
      const calEvent = createCalendarEvent(
        '2024-01-08T09:30:00',
        '2024-01-08T10:30:00'
      );

      // Task's persisted event overlaps the calendar event
      const taskEvt = createTaskEvent(
        'task-cal',
        '2024-01-08T10:00:00',
        '2024-01-08T11:00:00'
      );

      const result = run({
        tasks: [task],
        existingEvents: [taskEvt],
        allCalendarEvents: [calEvent, taskEvt],
      });

      assertNoOverlaps(result);

      const te = result.taskEvents[0];
      expect(te.events.length).toBeGreaterThan(0);
      // The rescheduled event(s) should NOT overlap the calendar event
      for (const ev of te.events) {
        const evStart = new Date(ev.start_time).getTime();
        const evEnd = new Date(ev.end_time).getTime();
        const calStart = new Date(calEvent.start_time).getTime();
        const calEnd = new Date(calEvent.end_time).getTime();
        const overlaps = evStart < calEnd && evEnd > calStart;
        expect(overlaps).toBe(false);
      }
    });

    it('handles three tasks where two pairs of DB events overlap', () => {
      const tasks = [
        createTask({ id: 't1', title: 'T1', planned_duration_minutes: 60 }),
        createTask({ id: 't2', title: 'T2', planned_duration_minutes: 60 }),
        createTask({ id: 't3', title: 'T3', planned_duration_minutes: 60 }),
      ];

      // t1 and t2 overlap, t2 and t3 overlap
      const evts: CalendarEventTask[] = [
        createTaskEvent('t1', '2024-01-08T09:15:00', '2024-01-08T10:15:00'),
        createTaskEvent('t2', '2024-01-08T09:45:00', '2024-01-08T10:45:00'),
        createTaskEvent('t3', '2024-01-08T10:30:00', '2024-01-08T11:30:00'),
      ];

      const result = run({
        tasks,
        existingEvents: evts,
        allCalendarEvents: evts as CalendarEventUnion[],
      });

      assertNoOverlaps(result);
      // All three tasks should get events
      result.taskEvents.forEach(te =>
        expect(te.events.length).toBeGreaterThan(0)
      );
    });
  });

  // ─── Avoidance of regular calendar events ───────────────────────────

  describe('avoidance of regular calendar events', () => {
    it('schedules task events around existing calendar events', () => {
      const task = createTask({
        title: 'Around meetings',
        planned_duration_minutes: 120,
      });

      // Morning meeting 9:00–11:00
      const meeting = createCalendarEvent(
        '2024-01-08T09:00:00',
        '2024-01-08T11:00:00'
      );

      const result = run({
        tasks: [task],
        allCalendarEvents: [meeting],
      });

      assertNoOverlaps(result);

      // All new events should start after the meeting ends
      for (const ev of result.taskEvents[0].events) {
        expect(new Date(ev.start_time).getTime()).toBeGreaterThanOrEqual(
          new Date(meeting.end_time).getTime()
        );
      }
    });

    it('fills gaps between multiple meetings', () => {
      const task = createTask({
        title: 'Gap filler',
        planned_duration_minutes: 180,
      });

      const meetings = [
        createCalendarEvent('2024-01-08T09:00:00', '2024-01-08T10:00:00'),
        createCalendarEvent('2024-01-08T11:00:00', '2024-01-08T12:00:00'),
        createCalendarEvent('2024-01-08T14:00:00', '2024-01-08T15:00:00'),
      ];

      const result = run({
        tasks: [task],
        allCalendarEvents: meetings,
      });

      assertNoOverlaps(result);
      expect(result.taskEvents[0].events.length).toBeGreaterThan(0);

      // No event should overlap any meeting
      for (const ev of result.taskEvents[0].events) {
        for (const meeting of meetings) {
          const overlaps =
            new Date(ev.start_time) < new Date(meeting.end_time) &&
            new Date(ev.end_time) > new Date(meeting.start_time);
          expect(overlaps).toBe(false);
        }
      }
    });
  });

  // ─── Blocked-by / dependency ordering ───────────────────────────────

  describe('dependency ordering', () => {
    it('schedules blocked task after blocker finishes', () => {
      const blocker = createTask({
        id: 'blocker',
        title: 'Blocker',
        planned_duration_minutes: 60,
      });
      const dependent = createTask({
        id: 'dependent',
        title: 'Dependent',
        planned_duration_minutes: 60,
        blockedBy: ['blocker'],
      });

      const result = run({ tasks: [blocker, dependent] });

      assertNoOverlaps(result);

      const blockerEvents = result.taskEvents.find(
        t => t.task.id === 'blocker'
      )!.events;
      const depEvents = result.taskEvents.find(
        t => t.task.id === 'dependent'
      )!.events;

      // The dependent should start after the last blocker event ends
      const blockerEnd = Math.max(
        ...blockerEvents.map(e => new Date(e.end_time).getTime())
      );
      const depStart = Math.min(
        ...depEvents.map(e => new Date(e.start_time).getTime())
      );
      expect(depStart).toBeGreaterThanOrEqual(blockerEnd);
    });
  });

  // ─── Schedule-aware working hours ───────────────────────────────────

  describe('schedule-aware working hours', () => {
    it('respects custom working hours from schedule', () => {
      const narrowSchedule: Schedule = {
        ...defaultSchedule,
        id: 'narrow',
        working_hours_start: 10,
        working_hours_end: 14,
      };

      const task = createTask({
        title: 'Narrow hours',
        planned_duration_minutes: 120,
        schedule_id: 'narrow',
      });

      const result = run({
        tasks: [task],
        schedules: [narrowSchedule],
        activeSchedule: narrowSchedule,
      });

      assertNoOverlaps(result);

      // All events should fall between 10:00 and 14:00
      for (const ev of result.taskEvents[0].events) {
        const h = new Date(ev.start_time).getHours();
        expect(h).toBeGreaterThanOrEqual(10);
        const endH =
          new Date(ev.end_time).getHours() +
          new Date(ev.end_time).getMinutes() / 60;
        expect(endH).toBeLessThanOrEqual(14);
      }
    });
  });

  // ─── Completed tasks are excluded ───────────────────────────────────

  describe('completed tasks', () => {
    it('excludes completed tasks from scheduling', () => {
      const tasks = [
        createTask({ title: 'Done', status: 'completed' }),
        createTask({ title: 'Todo', status: 'not-started' }),
      ];

      const result = run({ tasks });

      // Only the incomplete task should appear
      expect(result.taskEvents).toHaveLength(1);
      expect(result.taskEvents[0].task.title).toBe('Todo');
    });
  });

  // ─── Stress test: many tasks, zero overlaps ─────────────────────────

  describe('stress', () => {
    it('schedules 15 tasks with zero overlaps', () => {
      const tasks = Array.from({ length: 15 }, (_, i) =>
        createTask({
          title: `Stress-${i}`,
          planned_duration_minutes: 30,
        })
      );

      const result = run({ tasks });
      assertNoOverlaps(result);
      expect(result.totalEvents).toBe(15); // 1 event each (30 min fits in one slot)
    });

    it('schedules 5 long tasks (4h each) with zero overlaps', () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTask({
          title: `Long-${i}`,
          planned_duration_minutes: 240,
        })
      );

      const result = run({ tasks });
      assertNoOverlaps(result);
      // Each task needs multiple 60-min events (default eventDuration)
      expect(result.totalEvents).toBeGreaterThanOrEqual(15);
    });
  });

  // ─── Result shape ───────────────────────────────────────────────────

  describe('result shape', () => {
    it('correctly counts tasks with/without deadline', () => {
      const tasks = [
        createTask({ due_date: new Date('2024-01-15') }),
        createTask({ due_date: new Date('2024-01-20') }),
        createTask({ due_date: null }),
      ];

      const result = run({ tasks });
      expect(result.tasksWithDeadlineCount).toBe(2);
      expect(result.tasksWithoutDeadlineCount).toBe(1);
    });

    it('totalEvents equals sum of all task event arrays', () => {
      const tasks = [
        createTask({ planned_duration_minutes: 120 }),
        createTask({ planned_duration_minutes: 60 }),
      ];

      const result = run({ tasks });
      const manual = result.taskEvents.reduce(
        (s, te) => s + te.events.length,
        0
      );
      expect(result.totalEvents).toBe(manual);
    });
  });
});
