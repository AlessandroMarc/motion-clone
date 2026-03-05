import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  Schedule,
} from '../../types/database.js';

const mockGetAllTasks = jest.fn<(authToken: string) => Promise<Task[]>>();
const mockGetAllCalendarEvents =
  jest.fn<(authToken: string) => Promise<CalendarEventUnion[]>>();
const mockCreateCalendarEventsBatch =
  jest.fn<
    (
      inputs: unknown[],
      authToken: string
    ) => Promise<Array<{ success: boolean }>>
  >();
const mockDeleteCalendarEventsBatch =
  jest.fn<
    (
      eventIds: string[],
      authToken: string
    ) => Promise<Array<{ success: boolean }>>
  >();
const mockGetUserSchedules =
  jest.fn<(userId: string, authToken: string) => Promise<Schedule[]>>();
const mockGetActiveSchedule =
  jest.fn<(userId: string, authToken: string) => Promise<Schedule | null>>();
const mockCalculateAutoSchedule = jest.fn();
const mockExpandRecurringTasks =
  jest.fn<
    (
      tasks: Task[],
      existingTaskEvents: CalendarEventTask[]
    ) => CalendarEventTask[]
  >();

jest.unstable_mockModule('../taskService.js', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    getAllTasks: mockGetAllTasks,
  })),
}));

jest.unstable_mockModule('../calendarEventService.js', () => ({
  CalendarEventService: jest.fn().mockImplementation(() => ({
    getAllCalendarEvents: mockGetAllCalendarEvents,
    createCalendarEventsBatch: mockCreateCalendarEventsBatch,
    deleteCalendarEventsBatch: mockDeleteCalendarEventsBatch,
  })),
}));

jest.unstable_mockModule('../userSettingsService.js', () => ({
  UserSettingsService: jest.fn().mockImplementation(() => ({
    getUserSchedules: mockGetUserSchedules,
    getActiveSchedule: mockGetActiveSchedule,
  })),
}));

jest.unstable_mockModule('../../utils/autoScheduleCalculator.js', () => ({
  calculateAutoSchedule: mockCalculateAutoSchedule,
}));

jest.unstable_mockModule('../../utils/recurrenceCalculator.js', () => ({
  expandRecurringTasks: mockExpandRecurringTasks,
}));

const { AutoScheduleService } = await import('../autoScheduleService.js');

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: "Studiare verbi e parole nuove dall'imperativo",
  description: 'language study',
  due_date: null,
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  user_id: 'user-1',
  created_at: new Date('2026-03-05T08:00:00.000Z'),
  updated_at: new Date('2026-03-05T08:00:00.000Z'),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  is_recurring: false,
  ...overrides,
});

const makeTaskEvent = (
  id: string,
  linkedTaskId: string,
  startIso: string,
  endIso: string
): CalendarEventTask => ({
  id,
  title: 'Task block',
  linked_task_id: linkedTaskId,
  start_time: new Date(startIso),
  end_time: new Date(endIso),
  user_id: 'user-1',
  created_at: new Date('2026-03-05T08:00:00.000Z'),
  updated_at: new Date('2026-03-05T08:00:00.000Z'),
  completed_at: null,
});

const makeSchedule = (): Schedule => ({
  id: 'sched-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 8,
  working_hours_end: 20,
  is_default: true,
  created_at: new Date('2026-03-01T00:00:00.000Z'),
  updated_at: new Date('2026-03-01T00:00:00.000Z'),
});

describe('AutoScheduleService schedule comparison', () => {
  let service: InstanceType<typeof AutoScheduleService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutoScheduleService();

    mockExpandRecurringTasks.mockReturnValue([]);
    mockCreateCalendarEventsBatch.mockResolvedValue([{ success: true }]);
    mockDeleteCalendarEventsBatch.mockResolvedValue([{ success: true }]);
  });

  test('detects non-optimal schedule and reschedules when one slot should move earlier', async () => {
    const userId = 'user-1';
    const token = 'token';
    const task = makeTask();
    const schedules = [makeSchedule()];

    // Existing (non-optimal): third study slot is late in the evening
    const existingMorning = makeTaskEvent(
      'e-1',
      task.id,
      '2026-03-05T13:35:00.000Z',
      '2026-03-05T13:55:00.000Z'
    );
    const existingAfternoon = makeTaskEvent(
      'e-2',
      task.id,
      '2026-03-05T14:00:00.000Z',
      '2026-03-05T14:20:00.000Z'
    );
    const existingLate = makeTaskEvent(
      'e-3',
      task.id,
      '2026-03-05T17:40:00.000Z',
      '2026-03-05T18:00:00.000Z'
    );

    mockGetAllTasks.mockResolvedValue([task]);
    mockGetAllCalendarEvents.mockResolvedValue([
      existingMorning,
      existingAfternoon,
      existingLate,
    ] as CalendarEventUnion[]);
    mockGetUserSchedules.mockResolvedValue(schedules);
    mockGetActiveSchedule.mockResolvedValue(schedules[0]);

    // Proposed (more optimal): move last 20-min slot to earlier contiguous window
    mockCalculateAutoSchedule.mockReturnValue({
      taskEvents: [
        {
          task,
          events: [
            {
              start_time: new Date('2026-03-05T13:35:00.000Z'),
              end_time: new Date('2026-03-05T13:55:00.000Z'),
            },
            {
              start_time: new Date('2026-03-05T14:00:00.000Z'),
              end_time: new Date('2026-03-05T14:20:00.000Z'),
            },
            {
              start_time: new Date('2026-03-05T14:25:00.000Z'),
              end_time: new Date('2026-03-05T14:45:00.000Z'),
            },
          ],
          violations: [],
        },
      ],
      totalEvents: 3,
      totalViolations: 0,
      tasksWithDeadlineCount: 0,
      tasksWithoutDeadlineCount: 1,
    });

    const result = await service.run(userId, token);

    expect(result.unchanged).toBe(false);
    expect(result.eventsCreated).toBe(1);
    expect(result.eventsDeleted).toBe(1);

    expect(mockCreateCalendarEventsBatch).toHaveBeenCalledTimes(1);
    expect(mockDeleteCalendarEventsBatch).toHaveBeenCalledTimes(1);

    const createArg = mockCreateCalendarEventsBatch.mock.calls[0]?.[0] as
      | Array<{ start_time: string; end_time: string; linked_task_id: string }>
      | undefined;
    expect(createArg).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          linked_task_id: task.id,
          start_time: '2026-03-05T14:25:00.000Z',
          end_time: '2026-03-05T14:45:00.000Z',
        }),
      ])
    );
  });

  test('does not reschedule when unique proposed schedule equals existing schedule', async () => {
    const userId = 'user-1';
    const token = 'token';
    const task = makeTask();
    const schedules = [makeSchedule()];

    const existingA = makeTaskEvent(
      'e-1',
      task.id,
      '2026-03-05T13:35:00.000Z',
      '2026-03-05T13:55:00.000Z'
    );
    const existingB = makeTaskEvent(
      'e-2',
      task.id,
      '2026-03-05T14:00:00.000Z',
      '2026-03-05T14:20:00.000Z'
    );

    mockGetAllTasks.mockResolvedValue([task]);
    mockGetAllCalendarEvents.mockResolvedValue([
      existingA,
      existingB,
    ] as CalendarEventUnion[]);
    mockGetUserSchedules.mockResolvedValue(schedules);
    mockGetActiveSchedule.mockResolvedValue(schedules[0]);

    // Include duplicate proposed event to assert unique schedule comparison.
    mockCalculateAutoSchedule.mockReturnValue({
      taskEvents: [
        {
          task,
          events: [
            {
              start_time: new Date('2026-03-05T13:35:00.000Z'),
              end_time: new Date('2026-03-05T13:55:00.000Z'),
            },
            {
              start_time: new Date('2026-03-05T14:00:00.000Z'),
              end_time: new Date('2026-03-05T14:20:00.000Z'),
            },
            {
              start_time: new Date('2026-03-05T14:00:00.000Z'),
              end_time: new Date('2026-03-05T14:20:00.000Z'),
            },
          ],
          violations: [],
        },
      ],
      totalEvents: 3,
      totalViolations: 0,
      tasksWithDeadlineCount: 0,
      tasksWithoutDeadlineCount: 1,
    });

    const result = await service.run(userId, token);

    expect(result.unchanged).toBe(true);
    expect(result.eventsCreated).toBe(0);
    expect(result.eventsDeleted).toBe(0);
    expect(mockCreateCalendarEventsBatch).not.toHaveBeenCalled();
    expect(mockDeleteCalendarEventsBatch).not.toHaveBeenCalled();
  });

  test('detects and cleans up DB duplicates when raw length differs from deduplicated length', async () => {
    const userId = 'user-1';
    const token = 'token';
    const task = makeTask();
    const schedules = [makeSchedule()];

    // DB has duplicate events (38 raw events, but only 27 unique)
    const existingA = makeTaskEvent(
      'e-1',
      task.id,
      '2026-03-05T13:35:00.000Z',
      '2026-03-05T13:55:00.000Z'
    );
    const existingB = makeTaskEvent(
      'e-2',
      task.id,
      '2026-03-05T14:00:00.000Z',
      '2026-03-05T14:20:00.000Z'
    );
    // Duplicate of existingB with different ID (simulates DB duplicate)
    const existingBDuplicate = makeTaskEvent(
      'e-3',
      task.id,
      '2026-03-05T14:00:00.000Z',
      '2026-03-05T14:20:00.000Z'
    );

    mockGetAllTasks.mockResolvedValue([task]);
    mockGetAllCalendarEvents.mockResolvedValue([
      existingA,
      existingB,
      existingBDuplicate, // Raw length is 3
    ] as CalendarEventUnion[]);
    mockGetUserSchedules.mockResolvedValue(schedules);
    mockGetActiveSchedule.mockResolvedValue(schedules[0]);

    // Proposed schedule has no duplicates (only 2 unique events)
    mockCalculateAutoSchedule.mockReturnValue({
      taskEvents: [
        {
          task,
          events: [
            {
              start_time: new Date('2026-03-05T13:35:00.000Z'),
              end_time: new Date('2026-03-05T13:55:00.000Z'),
            },
            {
              start_time: new Date('2026-03-05T14:00:00.000Z'),
              end_time: new Date('2026-03-05T14:20:00.000Z'),
            },
          ],
          violations: [],
        },
      ],
      totalEvents: 2,
      totalViolations: 0,
      tasksWithDeadlineCount: 0,
      tasksWithoutDeadlineCount: 1,
    });

    const result = await service.run(userId, token);

    // Should detect mismatch due to raw length check (3 !== 2)
    expect(result.unchanged).toBe(false);
    expect(result.eventsDeleted).toBeGreaterThan(0);
    expect(result.eventsCreated).toBeGreaterThan(0);

    // Should clean up all events and recreate without duplicates
    expect(mockDeleteCalendarEventsBatch).toHaveBeenCalled();
    expect(mockCreateCalendarEventsBatch).toHaveBeenCalled();
  });
});
