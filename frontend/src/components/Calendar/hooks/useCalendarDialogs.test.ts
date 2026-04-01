/**
 * Bug Condition Exploration Test
 *
 * Property 1: Bug Condition - Recurring Task Completion Incorrectly Calls completeTaskWithEvents
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * CRITICAL: This test MUST FAIL on unfixed code.
 * Failure confirms the bug: handleCompletionChoice('task', ...) with is_recurring=true
 * incorrectly calls completeTaskWithEvents, which sets actual_duration_minutes=planned_duration_minutes
 * and marks the task status="completed", stopping future occurrence generation.
 *
 * When the fix is applied, this test will PASS — encoding the expected behavior.
 */

import { renderHook, act } from '@testing-library/react';
import { useCalendarDialogs } from './useCalendarDialogs';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import type { Task, CalendarEventTask } from '@/types';

// Mock services
jest.mock('@/services/taskService', () => ({
  taskService: {
    getTaskById: jest.fn(),
    completeTaskWithEvents: jest.fn(),
    setTaskCompleted: jest.fn(),
    updateTask: jest.fn(),
  },
}));

jest.mock('@/services/calendarService', () => ({
  calendarService: {
    getCalendarEventsByTaskId: jest.fn(),
    updateCalendarEvent: jest.fn(),
    createCalendarEvent: jest.fn(),
    deleteCalendarEvent: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/confetti', () => ({
  fireConfetti: jest.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRecurringTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-recurring-1',
    title: 'Daily standup',
    description: undefined,
    due_date: null,
    priority: 'medium',
    status: 'in-progress',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    planned_duration_minutes: 30,
    actual_duration_minutes: 0,
    schedule_id: undefined,
    start_date: null,
    is_recurring: true,
    recurrence_pattern: 'daily',
    recurrence_interval: 1,
    recurrence_start_date: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCalendarEventTask(
  linkedTaskId: string,
  overrides: Partial<CalendarEventTask> = {}
): CalendarEventTask {
  return {
    id: 'event-1',
    title: 'Daily standup',
    start_time: new Date('2024-06-10T09:00:00Z'),
    end_time: new Date('2024-06-10T09:30:00Z'),
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    linked_task_id: linkedTaskId,
    completed_at: null,
    ...overrides,
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('useCalendarDialogs — Bug Condition Exploration (Property 1)', () => {
  const user = { id: 'user-1' };
  const refreshEvents = jest.fn().mockResolvedValue([]);
  const onTaskDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition
   *
   * For any calendar event whose linked task has is_recurring = true,
   * calling handleCompletionChoice('task', setEvents) MUST NOT call
   * taskService.completeTaskWithEvents. Instead it should complete only
   * the selected calendar event (completeSingleEvent path).
   *
   * ON UNFIXED CODE: This test FAILS because completeTaskWithEvents IS called.
   * ON FIXED CODE:   This test PASSES because completeTaskWithEvents is NOT called.
   */
  it('should NOT call completeTaskWithEvents when completing a recurring task (choice=task)', async () => {
    const recurringTask = makeRecurringTask();
    const taskEvent = makeCalendarEventTask(recurringTask.id);

    // Mock getTaskById to return a recurring task
    (taskService.getTaskById as jest.Mock).mockResolvedValue(recurringTask);

    // Mock updateCalendarEvent (used by completeSingleEvent path)
    const updatedEvent = { ...taskEvent, completed_at: new Date() };
    (calendarService.updateCalendarEvent as jest.Mock).mockResolvedValue(
      updatedEvent
    );

    const setEvents = jest.fn();

    const { result } = renderHook(() =>
      useCalendarDialogs(user, refreshEvents, onTaskDropped)
    );

    // Set up the hook state: open the edit dialog for the task event
    act(() => {
      result.current.openEditDialog(taskEvent);
    });

    // Call handleCompletionChoice with 'task' choice for a recurring task
    await act(async () => {
      await result.current.handleCompletionChoice('task', setEvents);
    });

    // ASSERTION 1: completeTaskWithEvents must NOT be called for recurring tasks
    // ON UNFIXED CODE: FAILS — completeTaskWithEvents IS called (the bug)
    expect(taskService.completeTaskWithEvents).not.toHaveBeenCalled();

    // ASSERTION 2: calendarService.updateCalendarEvent must be called with completed_at set
    // (the completeSingleEvent path)
    // ON UNFIXED CODE: FAILS — updateCalendarEvent is NOT called via this path
    expect(calendarService.updateCalendarEvent).toHaveBeenCalledWith(
      taskEvent.id,
      expect.objectContaining({
        completed_at: expect.any(String),
      })
    );
  });

  /**
   * Verify the task's status and actual_duration_minutes are unchanged
   * after handleCompletionChoice('task', ...) for a recurring task.
   *
   * ON UNFIXED CODE: FAILS — completeTaskWithEvents calls setTaskCompleted which
   * sets actual_duration_minutes = planned_duration_minutes (30) and status = "completed".
   */
  it('should leave recurring task status and actual_duration_minutes unchanged', async () => {
    const recurringTask = makeRecurringTask({
      status: 'in-progress',
      actual_duration_minutes: 0,
      planned_duration_minutes: 30,
    });
    const taskEvent = makeCalendarEventTask(recurringTask.id);

    (taskService.getTaskById as jest.Mock).mockResolvedValue(recurringTask);

    const updatedEvent = { ...taskEvent, completed_at: new Date() };
    (calendarService.updateCalendarEvent as jest.Mock).mockResolvedValue(
      updatedEvent
    );

    // Capture any updateTask calls to detect mutation of actual_duration_minutes
    (taskService.updateTask as jest.Mock).mockResolvedValue(recurringTask);

    const setEvents = jest.fn();

    const { result } = renderHook(() =>
      useCalendarDialogs(user, refreshEvents, onTaskDropped)
    );

    act(() => {
      result.current.openEditDialog(taskEvent);
    });

    await act(async () => {
      await result.current.handleCompletionChoice('task', setEvents);
    });

    // The task's actual_duration_minutes must NOT be set to planned_duration_minutes
    // ON UNFIXED CODE: FAILS — updateTask is called with actualDurationMinutes=30
    expect(taskService.updateTask).not.toHaveBeenCalledWith(
      recurringTask.id,
      expect.objectContaining({
        actualDurationMinutes: recurringTask.planned_duration_minutes,
      })
    );

    // The task's status must NOT be set to 'completed'
    // (setTaskCompleted triggers this via updateTask)
    const updateTaskCalls = (taskService.updateTask as jest.Mock).mock.calls;
    for (const [, payload] of updateTaskCalls) {
      expect(payload).not.toMatchObject({ status: 'completed' });
    }
  });
});

// ─── Preservation Property Tests ─────────────────────────────────────────────

/**
 * Property 2: Preservation - Non-Recurring and Session-Only Completion Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests MUST PASS on unfixed code.
 * They document the baseline behavior that must not regress after the fix.
 */

// ─── Generators (parameterized random-like inputs) ───────────────────────────

/** Generate a non-recurring task with varied fields */
function makeNonRecurringTask(
  seed: number,
  overrides: Partial<Task> = {}
): Task {
  const priorities = ['low', 'medium', 'high'] as const;
  const statuses = ['not-started', 'in-progress'] as const;
  return {
    id: `task-non-recurring-${seed}`,
    title: `Non-recurring task ${seed}`,
    description: seed % 2 === 0 ? `Description ${seed}` : undefined,
    due_date: seed % 3 === 0 ? new Date(`2024-0${(seed % 9) + 1}-15`) : null,
    priority: priorities[seed % priorities.length],
    status: statuses[seed % statuses.length],
    dependencies: [],
    blockedBy: [],
    project_id: seed % 4 === 0 ? `project-${seed}` : undefined,
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    planned_duration_minutes: 15 + (seed % 8) * 15,
    actual_duration_minutes: 0,
    schedule_id: undefined,
    start_date: null,
    is_recurring: false,
    recurrence_pattern: undefined,
    recurrence_interval: 1,
    recurrence_start_date: null,
    ...overrides,
  };
}

/** Generate a recurring task with varied fields */
function makeRecurringTaskVariant(
  seed: number,
  overrides: Partial<Task> = {}
): Task {
  const patterns = ['daily', 'weekly', 'monthly'] as const;
  return {
    id: `task-recurring-${seed}`,
    title: `Recurring task ${seed}`,
    description: undefined,
    due_date: null,
    priority: 'medium',
    status: 'in-progress',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    planned_duration_minutes: 30 + (seed % 4) * 15,
    actual_duration_minutes: 0,
    schedule_id: undefined,
    start_date: null,
    is_recurring: true,
    recurrence_pattern: patterns[seed % patterns.length],
    recurrence_interval: (seed % 3) + 1,
    recurrence_start_date: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeEventForTask(task: Task, seed: number): CalendarEventTask {
  return {
    id: `event-${seed}`,
    title: task.title,
    start_time: new Date(`2024-06-${10 + (seed % 15)}T09:00:00Z`),
    end_time: new Date(`2024-06-${10 + (seed % 15)}T09:30:00Z`),
    user_id: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    linked_task_id: task.id,
    completed_at: null,
  };
}

// ─── Suite: Preservation of non-recurring task 'task' choice ─────────────────

describe("useCalendarDialogs — Preservation (Property 2): non-recurring 'task' choice", () => {
  const user = { id: 'user-1' };
  const refreshEvents = jest.fn().mockResolvedValue([]);
  const onTaskDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * For any non-recurring task, handleCompletionChoice('task', ...) MUST call
   * completeTaskWithEvents. This is the baseline behavior to preserve.
   *
   * ON UNFIXED CODE: PASSES — completeTaskWithEvents IS called for all tasks.
   * ON FIXED CODE:   PASSES — completeTaskWithEvents is still called for non-recurring tasks.
   */
  const nonRecurringSeeds = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23];

  nonRecurringSeeds.forEach(seed => {
    it(`should call completeTaskWithEvents for non-recurring task (seed=${seed})`, async () => {
      const task = makeNonRecurringTask(seed);
      const event = makeEventForTask(task, seed);

      (taskService.getTaskById as jest.Mock).mockResolvedValue(task);
      (taskService.completeTaskWithEvents as jest.Mock).mockResolvedValue(task);
      refreshEvents.mockResolvedValue([]);

      const setEvents = jest.fn();

      const { result } = renderHook(() =>
        useCalendarDialogs(user, refreshEvents, onTaskDropped)
      );

      act(() => {
        result.current.openEditDialog(event);
      });

      await act(async () => {
        await result.current.handleCompletionChoice('task', setEvents);
      });

      // ASSERTION: completeTaskWithEvents MUST be called for non-recurring tasks
      expect(taskService.completeTaskWithEvents).toHaveBeenCalledWith(task);
    });
  });
});

// ─── Suite: Preservation of 'session' choice for any task ────────────────────

describe("useCalendarDialogs — Preservation (Property 2): 'session' choice always calls completeSingleEvent", () => {
  const user = { id: 'user-1' };
  const refreshEvents = jest.fn().mockResolvedValue([]);
  const onTaskDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * For any task (recurring or non-recurring), handleCompletionChoice('session', ...)
   * MUST call completeSingleEvent (via calendarService.updateCalendarEvent).
   *
   * ON UNFIXED CODE: PASSES — 'session' choice always routes to completeSingleEvent.
   * ON FIXED CODE:   PASSES — 'session' choice still routes to completeSingleEvent.
   */

  // Non-recurring tasks with 'session' choice
  const nonRecurringSeeds = [2, 4, 6, 8, 10];
  nonRecurringSeeds.forEach(seed => {
    it(`should call completeSingleEvent for non-recurring task with 'session' choice (seed=${seed})`, async () => {
      const task = makeNonRecurringTask(seed);
      const event = makeEventForTask(task, seed);
      const updatedEvent = { ...event, completed_at: new Date().toISOString() };

      (taskService.getTaskById as jest.Mock).mockResolvedValue(task);
      (calendarService.updateCalendarEvent as jest.Mock).mockResolvedValue(
        updatedEvent
      );

      const setEvents = jest.fn();

      const { result } = renderHook(() =>
        useCalendarDialogs(user, refreshEvents, onTaskDropped)
      );

      act(() => {
        result.current.openEditDialog(event);
      });

      await act(async () => {
        await result.current.handleCompletionChoice('session', setEvents);
      });

      // ASSERTION: updateCalendarEvent MUST be called (completeSingleEvent path)
      expect(calendarService.updateCalendarEvent).toHaveBeenCalledWith(
        event.id,
        expect.objectContaining({ completed_at: expect.any(String) })
      );
      // ASSERTION: completeTaskWithEvents must NOT be called
      expect(taskService.completeTaskWithEvents).not.toHaveBeenCalled();
    });
  });

  // Recurring tasks with 'session' choice
  const recurringSeeds = [1, 3, 5, 7, 9];
  recurringSeeds.forEach(seed => {
    it(`should call completeSingleEvent for recurring task with 'session' choice (seed=${seed})`, async () => {
      const task = makeRecurringTaskVariant(seed);
      const event = makeEventForTask(task, seed);
      const updatedEvent = { ...event, completed_at: new Date().toISOString() };

      (taskService.getTaskById as jest.Mock).mockResolvedValue(task);
      (calendarService.updateCalendarEvent as jest.Mock).mockResolvedValue(
        updatedEvent
      );

      const setEvents = jest.fn();

      const { result } = renderHook(() =>
        useCalendarDialogs(user, refreshEvents, onTaskDropped)
      );

      act(() => {
        result.current.openEditDialog(event);
      });

      await act(async () => {
        await result.current.handleCompletionChoice('session', setEvents);
      });

      // ASSERTION: updateCalendarEvent MUST be called (completeSingleEvent path)
      expect(calendarService.updateCalendarEvent).toHaveBeenCalledWith(
        event.id,
        expect.objectContaining({ completed_at: expect.any(String) })
      );
      // ASSERTION: completeTaskWithEvents must NOT be called
      expect(taskService.completeTaskWithEvents).not.toHaveBeenCalled();
    });
  });
});

// ─── Suite: Preservation of single-session recurring task path ────────────────

describe('useCalendarDialogs — Preservation (Property 2): single-session recurring task path', () => {
  const user = { id: 'user-1' };
  const refreshEvents = jest.fn().mockResolvedValue([]);
  const onTaskDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * When a recurring task has no other incomplete sessions, handleUpdateCompletion
   * MUST call completeSingleEvent directly (no dialog shown).
   *
   * ON UNFIXED CODE: PASSES — single-session path routes to completeSingleEvent.
   * ON FIXED CODE:   PASSES — single-session path still routes to completeSingleEvent.
   */
  const seeds = [1, 5, 9];
  seeds.forEach(seed => {
    it(`should call completeSingleEvent directly for single-session recurring task (seed=${seed})`, async () => {
      const task = makeRecurringTaskVariant(seed);
      const event = makeEventForTask(task, seed);
      const updatedEvent = { ...event, completed_at: new Date().toISOString() };

      // Only this event exists — no other incomplete sessions
      (
        calendarService.getCalendarEventsByTaskId as jest.Mock
      ).mockResolvedValue([event]);
      (calendarService.updateCalendarEvent as jest.Mock).mockResolvedValue(
        updatedEvent
      );

      const setEvents = jest.fn();

      const { result } = renderHook(() =>
        useCalendarDialogs(user, refreshEvents, onTaskDropped)
      );

      act(() => {
        result.current.openEditDialog(event);
      });

      await act(async () => {
        await result.current.handleUpdateCompletion(true, setEvents);
      });

      // ASSERTION: completionChoiceOpen must NOT be set (no dialog)
      expect(result.current.completionChoiceOpen).toBe(false);

      // ASSERTION: updateCalendarEvent MUST be called (completeSingleEvent path)
      expect(calendarService.updateCalendarEvent).toHaveBeenCalledWith(
        event.id,
        expect.objectContaining({ completed_at: expect.any(String) })
      );
      // ASSERTION: completeTaskWithEvents must NOT be called
      expect(taskService.completeTaskWithEvents).not.toHaveBeenCalled();
    });
  });
});
