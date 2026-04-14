import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
  Task,
} from '../../types/database.js';

// ── mock modules BEFORE any dynamic import ───────────────────────────────
jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: {},
  serviceRoleSupabase: {},
  getAuthenticatedSupabase: jest.fn().mockReturnValue({}),
  verifyAuthToken: jest
    .fn()
    .mockReturnValue({ userId: 'user-1', exp: 9999999999 }),
}));

const mockCalendarEventService = {
  createCalendarEvent: jest.fn(),
  getAllCalendarEvents: jest.fn(),
};
jest.unstable_mockModule('../calendarEventService.js', () => ({
  CalendarEventService: jest
    .fn()
    .mockImplementation(() => mockCalendarEventService),
}));

const mockUserSettingsService = {
  getActiveSchedule: jest.fn(),
  getUserSchedules: jest.fn(),
};
jest.unstable_mockModule('../userSettingsService.js', () => ({
  UserSettingsService: jest
    .fn()
    .mockImplementation(() => mockUserSettingsService),
}));

const mockAutoScheduleService = {
  run: jest.fn(),
};
jest.unstable_mockModule('../autoScheduleService.js', () => ({
  AutoScheduleService: jest
    .fn()
    .mockImplementation(() => mockAutoScheduleService),
}));

const mockTaskService = {
  getAllTasks: jest.fn(),
};
jest.unstable_mockModule('../taskService.js', () => ({
  TaskService: jest.fn().mockImplementation(() => mockTaskService),
}));

const mockCalculateAutoSchedule = jest.fn();
jest.unstable_mockModule('../../utils/autoScheduleCalculator.js', () => ({
  calculateAutoSchedule: mockCalculateAutoSchedule,
}));

const mockExpandRecurringTasks = jest.fn();
jest.unstable_mockModule('../../utils/recurrenceCalculator.js', () => ({
  expandRecurringTasks: mockExpandRecurringTasks,
}));

// ── dynamic imports AFTER mocks ──────────────────────────────────────────
const { DayBlockService, workingEndToTimeString, buildLocalDateTime } =
  await import('../dayBlockService.js');

const mockClient = {} as SupabaseClient;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── workingEndToTimeString ───────────────────────────────────────────────
describe('workingEndToTimeString', () => {
  test('handles integer hours', () => {
    expect(workingEndToTimeString(18)).toBe('18:00');
    expect(workingEndToTimeString(9)).toBe('09:00');
    expect(workingEndToTimeString(0)).toBe('00:00');
  });

  test('handles half-hours', () => {
    expect(workingEndToTimeString(17.5)).toBe('17:30');
    expect(workingEndToTimeString(9.5)).toBe('09:30');
  });

  test('handles quarter-hours', () => {
    expect(workingEndToTimeString(8.75)).toBe('08:45');
    expect(workingEndToTimeString(8.25)).toBe('08:15');
  });

  test('rounds fractional minutes to the nearest minute', () => {
    // 17 + 0.5083... ≈ 17:30 (rounded)
    expect(workingEndToTimeString(17 + 30.4 / 60)).toBe('17:30');
  });

  test('handles 23:00 (last hour of day)', () => {
    expect(workingEndToTimeString(23)).toBe('23:00');
  });
});

// ── buildLocalDateTime ───────────────────────────────────────────────────
describe('buildLocalDateTime', () => {
  test('produces a Date with the correct local-time components', () => {
    const d = buildLocalDateTime('2026-04-13', '14:30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
  });

  test('handles midnight (00:00)', () => {
    const d = buildLocalDateTime('2026-01-01', '00:00');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  test('handles end-of-day (23:59)', () => {
    const d = buildLocalDateTime('2026-12-31', '23:59');
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  test('does not interpret the date as UTC midnight (avoids timezone trap)', () => {
    const d = buildLocalDateTime('2026-04-13', '00:00');
    expect(d.getDate()).toBe(13);
  });

  test('normalises out-of-range values via Date constructor wrap-around', () => {
    // `new Date(2026, 1, 30)` wraps to March 2 — a known silent-acceptance
    // behaviour that the regex validation layer is supposed to prevent.
    // This test documents the behaviour so callers know they must validate
    // the date format at the boundary.
    const d = buildLocalDateTime('2026-02-30', '09:00');
    expect(d.getMonth()).toBe(2); // March (wrap-around)
  });
});

// ── DayBlockService ──────────────────────────────────────────────────────
describe('DayBlockService', () => {
  const svc = new DayBlockService();

  // ── resolveTimes ────────────────────────────────────────────────────
  describe('resolveTimes', () => {
    const baseSchedule: Schedule = {
      id: 's1',
      user_id: 'user-1',
      name: 'Work',
      working_hours_start: 9,
      working_hours_end: 17,
      is_default: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    test('happy path: returns startTime / endTime from global working hours', async () => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(baseSchedule);
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-13',
        '10:00'
      );
      if ('error' in result) throw new Error('expected success');
      expect(result.startTime.getHours()).toBe(10);
      expect(result.endTime.getHours()).toBe(17);
      expect(result.isNonWorkingDay).toBe(false);
    });

    test('uses working_days override when present', async () => {
      const sched: Schedule = {
        ...baseSchedule,
        working_days: {
          0: null,
          1: { start: 9, end: 17 },
          2: { start: 9, end: 17 },
          3: { start: 9, end: 17 },
          4: { start: 9, end: 17 },
          5: { start: 9, end: 17 },
          6: { start: 10, end: 14 },
        },
      };
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(sched);
      // 2026-04-11 is a Saturday (dow=6)
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-11',
        '10:00'
      );
      if ('error' in result) throw new Error('expected success');
      expect(result.endTime.getHours()).toBe(14);
      expect(result.isNonWorkingDay).toBe(false);
    });

    test('marks non-working day (working_days[dow] === null)', async () => {
      const sched: Schedule = {
        ...baseSchedule,
        working_days: {
          0: null, // Sunday off
          1: { start: 9, end: 17 },
          2: { start: 9, end: 17 },
          3: { start: 9, end: 17 },
          4: { start: 9, end: 17 },
          5: { start: 9, end: 17 },
          6: null,
        },
      };
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(sched);
      // 2026-04-12 is a Sunday
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-12',
        '10:00'
      );
      if ('error' in result) throw new Error('expected success');
      expect(result.isNonWorkingDay).toBe(true);
      // Falls back to working_hours_end (17)
      expect(result.endTime.getHours()).toBe(17);
    });

    test('returns error when from_time equals working end', async () => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(baseSchedule);
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-13',
        '17:00'
      );
      expect('error' in result).toBe(true);
    });

    test('returns error when from_time is after working end', async () => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(baseSchedule);
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-13',
        '19:00'
      );
      expect('error' in result).toBe(true);
    });

    test('handles fractional working_hours_end (e.g. 17.5)', async () => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue({
        ...baseSchedule,
        working_hours_end: 17.5,
      });
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-13',
        '10:00'
      );
      if ('error' in result) throw new Error('expected success');
      expect(result.endTime.getHours()).toBe(17);
      expect(result.endTime.getMinutes()).toBe(30);
    });

    test('defaults endTime to 18:00 when no schedule exists', async () => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(null);
      const result = await svc.resolveTimes(
        'user-1',
        'token',
        '2026-04-13',
        '10:00'
      );
      if ('error' in result) throw new Error('expected success');
      expect(result.endTime.getHours()).toBe(18);
      expect(result.isNonWorkingDay).toBe(false);
    });
  });

  // ── findOverlappingDayBlock ─────────────────────────────────────────
  describe('findOverlappingDayBlock', () => {
    const start = new Date(2026, 3, 13, 9, 0);
    const end = new Date(2026, 3, 13, 18, 0);

    test('returns the overlapping day block when one exists', async () => {
      const block = {
        id: 'db-1',
        is_day_block: true,
        start_time: new Date(2026, 3, 13, 10, 0).toISOString(),
        end_time: new Date(2026, 3, 13, 11, 0).toISOString(),
      } as unknown as CalendarEventUnion;
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([block]);
      const hit = await svc.findOverlappingDayBlock('token', start, end);
      expect(hit).toBe(block);
    });

    test('ignores non-day-block events even if they overlap', async () => {
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        {
          id: 'evt-1',
          start_time: new Date(2026, 3, 13, 10, 0).toISOString(),
          end_time: new Date(2026, 3, 13, 11, 0).toISOString(),
          // no is_day_block flag
        } as unknown as CalendarEventUnion,
      ]);
      const hit = await svc.findOverlappingDayBlock('token', start, end);
      expect(hit).toBeNull();
    });

    test('does not treat boundary-touching blocks as overlapping', async () => {
      // Block ends exactly at `start`
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        {
          id: 'db-touch',
          is_day_block: true,
          start_time: new Date(2026, 3, 13, 7, 0).toISOString(),
          end_time: start.toISOString(),
        } as unknown as CalendarEventUnion,
      ]);
      const hit = await svc.findOverlappingDayBlock('token', start, end);
      expect(hit).toBeNull();
    });

    test('detects day block that fully contains the window', async () => {
      const container = {
        id: 'db-big',
        is_day_block: true,
        start_time: new Date(2026, 3, 13, 0, 0).toISOString(),
        end_time: new Date(2026, 3, 13, 23, 59).toISOString(),
      } as unknown as CalendarEventUnion;
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        container,
      ]);
      const hit = await svc.findOverlappingDayBlock('token', start, end);
      expect(hit).toBe(container);
    });

    test('returns null when list is empty', async () => {
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([]);
      const hit = await svc.findOverlappingDayBlock('token', start, end);
      expect(hit).toBeNull();
    });
  });

  // ── simulate ────────────────────────────────────────────────────────
  describe('simulate', () => {
    const blockStart = new Date(2026, 3, 13, 12, 0);
    const blockEnd = new Date(2026, 3, 13, 18, 0);

    const taskA: Task = {
      id: 'task-a',
      title: 'Task A',
      priority: 'high',
      status: 'not-started',
      dependencies: [],
      user_id: 'user-1',
      created_at: new Date(),
      updated_at: new Date(),
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
      is_recurring: false,
      due_date: null,
    };

    // Events from the DB come back as ISO strings on start_time/end_time
    const eventInsideBlock = {
      id: 'evt-a1',
      title: 'Task A event',
      linked_task_id: 'task-a',
      completed_at: null,
      start_time: new Date(2026, 3, 13, 13, 0).toISOString(),
      end_time: new Date(2026, 3, 13, 14, 0).toISOString(),
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as CalendarEventTask;

    const eventOutsideBlock = {
      id: 'evt-a2',
      title: 'Task A event 2',
      linked_task_id: 'task-a',
      completed_at: null,
      start_time: new Date(2026, 3, 13, 9, 0).toISOString(),
      end_time: new Date(2026, 3, 13, 10, 0).toISOString(),
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as CalendarEventTask;

    beforeEach(() => {
      mockUserSettingsService.getActiveSchedule.mockResolvedValue(null);
      mockUserSettingsService.getUserSchedules.mockResolvedValue([]);
      mockExpandRecurringTasks.mockReturnValue([]);
    });

    test('includes overlapping events in tasksToMove; excludes outside ones', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([taskA]);
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        eventInsideBlock,
        eventOutsideBlock,
      ]);
      mockCalculateAutoSchedule.mockReturnValue({
        taskEvents: [
          {
            task: taskA,
            events: [
              {
                start_time: new Date(2026, 3, 14, 9, 0),
                end_time: new Date(2026, 3, 14, 10, 0),
              },
              {
                start_time: new Date(2026, 3, 14, 10, 0),
                end_time: new Date(2026, 3, 14, 11, 0),
              },
            ],
          },
        ],
        totalViolations: 0,
      });

      const result = await svc.simulate(
        mockClient,
        'user-1',
        'token',
        blockStart,
        blockEnd
      );

      // Only the blocked event is in tasksToMove
      expect(result.tasksToMove).toHaveLength(1);
      expect(result.tasksToMove[0]?.currentEvent.id).toBe('evt-a1');
      // Chunk correlation: the outside event is at index 0, the blocked at index 1,
      // so the blocked event's proposedTime comes from proposedEvents[1]
      expect(result.tasksToMove[0]?.proposedTime).not.toBeNull();
      expect(result.tasksToMove[0]?.proposedTime?.start.getHours()).toBe(10);
      expect(result.blockEndTime).toBe(blockEnd.toISOString());
      expect(result.isNonWorkingDay).toBe(false);
    });

    test('proposedTime is null when scheduler finds no slot for the chunk', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([taskA]);
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        eventInsideBlock,
      ]);
      mockCalculateAutoSchedule.mockReturnValue({
        taskEvents: [{ task: taskA, events: [] }],
        totalViolations: 1,
      });

      const result = await svc.simulate(
        mockClient,
        'user-1',
        'token',
        blockStart,
        blockEnd
      );

      expect(result.tasksToMove).toHaveLength(1);
      expect(result.tasksToMove[0]?.proposedTime).toBeNull();
      expect(result.violations).toBe(1);
    });

    test('returns empty tasksToMove when nothing overlaps the block', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([taskA]);
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        eventOutsideBlock,
      ]);
      mockCalculateAutoSchedule.mockReturnValue({
        taskEvents: [
          {
            task: taskA,
            events: [
              {
                start_time: new Date(
                  eventOutsideBlock.start_time as unknown as string
                ),
                end_time: new Date(
                  eventOutsideBlock.end_time as unknown as string
                ),
              },
            ],
          },
        ],
        totalViolations: 0,
      });

      const result = await svc.simulate(
        mockClient,
        'user-1',
        'token',
        blockStart,
        blockEnd
      );
      expect(result.tasksToMove).toHaveLength(0);
      expect(result.totalEventsCreated).toBe(0);
      expect(result.totalEventsDeleted).toBe(0);
    });

    test('counts createdbalance vs deleted via symmetric diff of keys', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([taskA]);
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([
        eventInsideBlock, // will be deleted (no match in proposed)
      ]);
      // Proposed event is a single chunk at a different time
      mockCalculateAutoSchedule.mockReturnValue({
        taskEvents: [
          {
            task: taskA,
            events: [
              {
                start_time: new Date(2026, 3, 14, 9, 0),
                end_time: new Date(2026, 3, 14, 10, 0),
              },
            ],
          },
        ],
        totalViolations: 0,
      });

      const result = await svc.simulate(
        mockClient,
        'user-1',
        'token',
        blockStart,
        blockEnd
      );
      expect(result.totalEventsCreated).toBe(1);
      expect(result.totalEventsDeleted).toBe(1);
    });

    test('propagates isNonWorkingDay flag through', async () => {
      mockTaskService.getAllTasks.mockResolvedValue([]);
      mockCalendarEventService.getAllCalendarEvents.mockResolvedValue([]);
      mockCalculateAutoSchedule.mockReturnValue({
        taskEvents: [],
        totalViolations: 0,
      });
      const result = await svc.simulate(
        mockClient,
        'user-1',
        'token',
        blockStart,
        blockEnd,
        /* isNonWorkingDay */ true
      );
      expect(result.isNonWorkingDay).toBe(true);
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe('create', () => {
    test('creates a day-block event and runs auto-schedule', async () => {
      const startTime = new Date(2026, 3, 13, 9, 0);
      const endTime = new Date(2026, 3, 13, 18, 0);
      const createdBlock = {
        id: 'db-new',
        title: 'Day blocked',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_day_block: true,
      } as unknown as CalendarEventUnion;
      mockCalendarEventService.createCalendarEvent.mockResolvedValue(
        createdBlock
      );
      mockAutoScheduleService.run.mockResolvedValue({
        unchanged: false,
        eventsCreated: 2,
        eventsDeleted: 2,
        violations: 0,
      });

      const result = await svc.create('user-1', 'token', startTime, endTime);

      expect(result.dayBlock).toBe(createdBlock);
      expect(result.scheduleResult.eventsCreated).toBe(2);
      expect(mockCalendarEventService.createCalendarEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Day blocked',
          is_day_block: true,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          user_id: 'user-1',
        }),
        undefined,
        'token'
      );
      expect(mockAutoScheduleService.run).toHaveBeenCalledWith(
        'user-1',
        'token'
      );
    });
  });
});
