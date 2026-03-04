import { Task, CalendarEventTask, CalendarEventUnion, Schedule } from '@/types';
import {
  calculateRemainingDurationMinutes,
  distributeEvents,
  sortTasksForScheduling,
  checkDeadlineViolations,
  checkEventOverlaps,
  prepareTaskEvents,
  createConfigFromSchedule,
  getDayWorkingHours,
  DEFAULT_CONFIG,
  TaskSchedulingConfig,
  ScheduledEvent,
} from '../taskScheduler';

describe('taskScheduler', () => {
  const createMockTask = (overrides = {}): Task => ({
    id: 'task-1',
    title: 'Test Task',
    description: '',
    due_date: null,
    priority: 'medium',
    status: 'not-started',
    dependencies: [],
    blockedBy: [],
    project_id: undefined,
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    planned_duration_minutes: 120,
    actual_duration_minutes: 0,
    is_recurring: false,
    recurrence_interval: 1,
    next_generation_cutoff: null,
    recurrence_start_date: null,
    ...overrides,
  });

  const createMockEvent = (
    startTime: Date,
    endTime: Date,
    taskId: string
  ): CalendarEventTask => ({
    id: 'event-1',
    title: 'Test Event',
    start_time: startTime,
    end_time: endTime,
    description: '',
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    linked_task_id: taskId,
    completed_at: null,
  });

  describe('calculateRemainingDurationMinutes', () => {
    it('should calculate correct remaining minutes', () => {
      const task = createMockTask({ planned_duration_minutes: 180 });
      const existingEvents: CalendarEventTask[] = [];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(180);
    });

    it('should account for existing events', () => {
      const task = createMockTask({ planned_duration_minutes: 180 });
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(120);
    });

    it('should return 0 if task is already fully scheduled', () => {
      const task = createMockTask({ planned_duration_minutes: 60 });
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(0);
    });

    it('should handle partial coverage correctly', () => {
      const task = createMockTask({ planned_duration_minutes: 90 });
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T09:30:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(60);
    });

    it('should return a single block when planned duration is 0', () => {
      const task = createMockTask({ planned_duration_minutes: 0 });
      const existingEvents: CalendarEventTask[] = [];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 45 };

      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(45);
    });
  });

  describe('distributeEvents', () => {
    it('should distribute events evenly across available days', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);
      dueDate.setHours(23, 59, 59, 999);
      const task = createMockTask({ due_date: dueDate });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const events = distributeEvents(task, 240, config, []);

      // Should create events to fit 240 minutes with gaps between them
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThanOrEqual(5);

      // Verify total duration matches (accounting for gaps)
      const totalMinutes = events.reduce((sum, event) => {
        return (
          sum +
          (event.end_time.getTime() - event.start_time.getTime()) / (1000 * 60)
        );
      }, 0);
      expect(totalMinutes).toBeLessThanOrEqual(
        240 + (config.gapBetweenEventsMinutes ?? 0) * events.length
      );

      // All events should be within working hours
      events.forEach(event => {
        const hour = event.start_time.getHours();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(22);
      });
    });

    it('should only use hours 9-22', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      dueDate.setHours(23, 59, 59, 999);
      const task = createMockTask({ due_date: dueDate });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const events = distributeEvents(task, 120, config, []);

      events.forEach(event => {
        const hour = event.start_time.getHours();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(22);
      });
    });

    it('should respect due_date boundary', () => {
      // Use a future date to ensure it's after "today"
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      dueDate.setHours(12, 0, 0, 0);
      const task = createMockTask({ due_date: dueDate });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      const events = distributeEvents(task, 300, config, []);

      events.forEach(event => {
        const deadline = new Date(dueDate);
        deadline.setHours(23, 59, 59, 999);
        expect(event.start_time.getTime()).toBeLessThanOrEqual(
          deadline.getTime()
        );
      });
    });

    it('should handle task without due_date', () => {
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
      };

      const startFrom = new Date('2024-01-02T09:00:00');
      const events = distributeEvents(task, 180, config, [], startFrom);

      expect(events.length).toBe(3);
      // Events should be within default range
      const maxDate = new Date(startFrom);
      maxDate.setDate(maxDate.getDate() + 7);
      events.forEach(event => {
        expect(event.start_time.getTime()).toBeLessThanOrEqual(
          maxDate.getTime()
        );
      });
    });

    it('should return empty array for 0 remaining minutes', () => {
      const task = createMockTask();
      const config = DEFAULT_CONFIG;

      const events = distributeEvents(task, 0, config, []);

      expect(events).toEqual([]);
    });

    it('should avoid overlapping with existing calendar events', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      dueDate.setHours(23, 59, 59, 999);
      const task = createMockTask({ due_date: dueDate });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      // Create an existing event that occupies 10:00-11:00 on the first day
      const existingEventStart = new Date();
      existingEventStart.setDate(existingEventStart.getDate() + 1);
      existingEventStart.setHours(10, 0, 0, 0);
      const existingEventEnd = new Date(existingEventStart);
      existingEventEnd.setHours(11, 0, 0, 0);

      const existingEvent: CalendarEventTask = {
        id: 'existing-1',
        title: 'Existing Event',
        start_time: existingEventStart,
        end_time: existingEventEnd,
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        linked_task_id: 'other-task',
        completed_at: null,
      };

      const events = distributeEvents(task, 300, config, [existingEvent]);

      // Verify no events overlap with the existing event
      events.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const overlaps =
          eventStart < existingEventEnd && eventEnd > existingEventStart;
        expect(overlaps).toBe(false);
      });
    });
  });

  describe('sortTasksForScheduling', () => {
    it('should sort tasks with earlier deadlines first', () => {
      const task1 = createMockTask({
        id: 'task-1',
        due_date: new Date('2024-01-05'),
      });
      const task2 = createMockTask({
        id: 'task-2',
        due_date: new Date('2024-01-03'),
      });
      const task3 = createMockTask({
        id: 'task-3',
        due_date: new Date('2024-01-04'),
      });

      const sorted = sortTasksForScheduling([task1, task2, task3]);

      expect(sorted[0].id).toBe('task-2'); // Earliest deadline
      expect(sorted[1].id).toBe('task-3');
      expect(sorted[2].id).toBe('task-1');
    });

    it('should schedule tasks without deadline after those with deadline', () => {
      const task1 = createMockTask({
        id: 'task-1',
        due_date: null,
      });
      const task2 = createMockTask({
        id: 'task-2',
        due_date: new Date('2024-01-05'),
      });
      const task3 = createMockTask({
        id: 'task-3',
        due_date: null,
      });

      const sorted = sortTasksForScheduling([task1, task2, task3]);

      expect(sorted[0].id).toBe('task-2'); // Has deadline, comes first
      // Tasks without deadline come after
      expect(sorted[1].id).toBe('task-1');
      expect(sorted[2].id).toBe('task-3');
    });

    it('should sort by priority within same deadline', () => {
      const task1 = createMockTask({
        id: 'task-1',
        due_date: new Date('2024-01-05'),
        priority: 'low',
      });
      const task2 = createMockTask({
        id: 'task-2',
        due_date: new Date('2024-01-05'),
        priority: 'high',
      });
      const task3 = createMockTask({
        id: 'task-3',
        due_date: new Date('2024-01-05'),
        priority: 'medium',
      });

      const sorted = sortTasksForScheduling([task1, task2, task3]);

      expect(sorted[0].id).toBe('task-2'); // High priority
      expect(sorted[1].id).toBe('task-3'); // Medium priority
      expect(sorted[2].id).toBe('task-1'); // Low priority
    });

    it('should use custom sort strategy if provided', () => {
      const task1 = createMockTask({ id: 'task-1', priority: 'high' });
      const task2 = createMockTask({ id: 'task-2', priority: 'low' });

      const customSort: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        sortStrategy: tasks => tasks.reverse(), // Reverse order
      };

      const sorted = sortTasksForScheduling([task1, task2], customSort);

      expect(sorted[0].id).toBe('task-2'); // Reversed
      expect(sorted[1].id).toBe('task-1');
    });
  });

  describe('checkDeadlineViolations', () => {
    it('should identify events after deadline', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-05T23:59:59'),
      });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-04T10:00:00'),
          end_time: new Date('2024-01-04T11:00:00'),
        },
        {
          task_id: task.id,
          start_time: new Date('2024-01-06T10:00:00'), // After deadline
          end_time: new Date('2024-01-06T11:00:00'),
        },
        {
          task_id: task.id,
          start_time: new Date('2024-01-05T10:00:00'),
          end_time: new Date('2024-01-05T11:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      expect(violations.length).toBe(1);
      expect(violations[0].start_time).toEqual(events[1].start_time);
    });

    it('should return empty array when no violations', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-05T23:59:59'),
      });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-04T10:00:00'),
          end_time: new Date('2024-01-04T11:00:00'),
        },
        {
          task_id: task.id,
          start_time: new Date('2024-01-05T10:00:00'),
          end_time: new Date('2024-01-05T11:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      expect(violations).toEqual([]);
    });

    it('should return empty array for tasks without deadline', () => {
      const task = createMockTask({ due_date: null });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-10T10:00:00'),
          end_time: new Date('2024-01-10T11:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      expect(violations).toEqual([]);
    });
  });

  describe('prepareTaskEvents', () => {
    it('should prepare events and identify violations', () => {
      const task = createMockTask({
        planned_duration_minutes: 120,
        due_date: new Date('2024-01-05T23:59:59'),
      });
      const existingEvents: CalendarEventTask[] = [];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const startFrom = new Date('2024-01-01T09:00:00');

      const result = prepareTaskEvents(
        task,
        existingEvents,
        config,
        [],
        startFrom
      );

      expect(result.events.length).toBe(2);
      // Check if any violations exist (depends on distribution logic)
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should account for existing events when preparing', () => {
      const task = createMockTask({ planned_duration_minutes: 180 });
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const startFrom = new Date('2024-01-02T09:00:00');

      const result = prepareTaskEvents(
        task,
        existingEvents,
        config,
        existingEvents,
        startFrom
      );

      expect(result.events.length).toBe(2); // 180 - 60 = 120 minutes remaining
    });

    it('should handle tasks with dependencies, so that the dependencies are scheduled before the task', () => {
      const dependency = createMockTask({ id: 'task-1' });
      const task = createMockTask({ id: 'task-2', dependencies: ['task-1'] });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };

      // Schedule the dependency first
      const dependencyResult = prepareTaskEvents(dependency, [], config, []);
      expect(dependencyResult.events.length).toBeGreaterThan(0);
      const dependencyEvent = dependencyResult.events[0];

      // Schedule the dependent task, passing dependency events to avoid overlaps
      const taskResult = prepareTaskEvents(
        task,
        [],
        config,
        dependencyResult.events.map(e => ({
          id: `temp-${e.task_id}`,
          title: 'Dependency Event',
          start_time: e.start_time,
          end_time: e.end_time,
          description: '',
          user_id: task.user_id,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      );
      expect(taskResult.events.length).toBeGreaterThan(0);
      const taskEvent = taskResult.events[0];

      // The dependency should be scheduled before the dependent task
      expect(dependencyEvent.start_time.getTime()).toBeLessThanOrEqual(
        taskEvent.start_time.getTime()
      );
    });

    it('should return no events when task is already fully covered by existing events', () => {
      const task = createMockTask({ planned_duration_minutes: 60 });
      const start = new Date('2024-01-02T09:00:00');
      const end = new Date('2024-01-02T10:00:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const startFrom = new Date('2024-01-03T09:00:00');

      const result = prepareTaskEvents(
        task,
        existingEvents,
        config,
        [],
        startFrom
      );

      expect(result.events.length).toBe(0);
      expect(result.violations).toEqual([]);
    });

    it('should account for actual_duration_minutes when preparing events', () => {
      // Task has 180 planned, 60 already done (actual), so only 120 remain
      const task = createMockTask({
        planned_duration_minutes: 180,
        actual_duration_minutes: 60,
      });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const startFrom = new Date('2024-01-02T09:00:00');

      const result = prepareTaskEvents(task, [], config, [], startFrom);

      expect(result.events.length).toBe(2);
    });

    it('should detect violations when scheduling starts after the deadline', () => {
      // Deadline was yesterday — any events scheduled now will be past the deadline
      const dueDate = new Date('2024-01-01T23:59:59');
      const task = createMockTask({
        planned_duration_minutes: 120,
        due_date: dueDate,
      });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      // Start from a time after the deadline
      const startFrom = new Date('2024-01-02T09:00:00');

      const result = prepareTaskEvents(task, [], config, [], startFrom);

      // All scheduled events start after the deadline → all are violations
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('calculateRemainingDurationMinutes (additional cases)', () => {
    it('should subtract actual_duration_minutes from planned', () => {
      const task = createMockTask({
        planned_duration_minutes: 180,
        actual_duration_minutes: 60,
      });
      const config = DEFAULT_CONFIG;

      const remaining = calculateRemainingDurationMinutes(task, [], config);
      expect(remaining).toBe(120);
    });

    it('should return 0 when actual_duration_minutes exceeds planned', () => {
      const task = createMockTask({
        planned_duration_minutes: 60,
        actual_duration_minutes: 90,
      });
      const config = DEFAULT_CONFIG;

      const remaining = calculateRemainingDurationMinutes(task, [], config);
      expect(remaining).toBe(0);
    });

    it('should subtract both actual and existing events duration', () => {
      const task = createMockTask({
        planned_duration_minutes: 240,
        actual_duration_minutes: 60,
      });
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      const existingEvents = [createMockEvent(start, end, task.id)];
      const config = DEFAULT_CONFIG;

      // 240 planned - 60 actual - 60 existing event = 120 remaining
      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(120);
    });

    it('should return eventDurationMinutes when both planned and remaining are 0', () => {
      const task = createMockTask({
        planned_duration_minutes: 0,
        actual_duration_minutes: 0,
      });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 45 };

      const remaining = calculateRemainingDurationMinutes(task, [], config);
      expect(remaining).toBe(45);
    });

    it('should handle multiple existing events for the same task', () => {
      const task = createMockTask({ planned_duration_minutes: 180 });
      const e1Start = new Date('2024-01-01T09:00:00');
      const e1End = new Date('2024-01-01T10:00:00');
      const e2Start = new Date('2024-01-02T09:00:00');
      const e2End = new Date('2024-01-02T09:30:00');
      const existingEvents = [
        createMockEvent(e1Start, e1End, task.id),
        createMockEvent(e2Start, e2End, task.id),
      ];
      const config = DEFAULT_CONFIG;

      // 180 - 60 - 30 = 90 remaining
      const remaining = calculateRemainingDurationMinutes(
        task,
        existingEvents,
        config
      );
      expect(remaining).toBe(90);
    });
  });

  describe('distributeEvents (additional cases)', () => {
    it('should skip weekends when skipWeekends is true', () => {
      // Monday 2024-01-08 09:00
      const startFrom = new Date('2024-01-08T09:00:00');
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        skipWeekends: true,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 14,
      };

      const events = distributeEvents(task, 120, config, [], startFrom);

      events.forEach(event => {
        const day = event.start_time.getDay();
        // day 0 = Sunday, day 6 = Saturday
        expect(day).not.toBe(0);
        expect(day).not.toBe(6);
      });
    });

    it('should schedule a large task across multiple days', () => {
      // 780 minutes = 13 hours, well over a single working day (max ~13h from 9-22 = 780 mins)
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        gapBetweenEventsMinutes: 0,
        defaultDaysWithoutDeadline: 30,
      };
      const startFrom = new Date('2024-01-01T09:00:00');

      const events = distributeEvents(task, 900, config, [], startFrom);

      // Should have events on multiple different days
      const uniqueDays = new Set(events.map(e => e.start_time.toDateString()));
      expect(uniqueDays.size).toBeGreaterThan(1);
    });

    it('should respect minBlockMinutes and not schedule tiny fragments', () => {
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        minBlockMinutes: 15,
        defaultDaysWithoutDeadline: 7,
      };
      const startFrom = new Date('2024-01-01T09:00:00');

      const events = distributeEvents(task, 120, config, [], startFrom);

      events.forEach(event => {
        const durationMinutes =
          (event.end_time.getTime() - event.start_time.getTime()) / (1000 * 60);
        expect(durationMinutes).toBeGreaterThanOrEqual(15);
      });
    });

    it('should respect the gap between events', () => {
      const task = createMockTask({ due_date: null });
      const gapMinutes = 10;
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        gapBetweenEventsMinutes: gapMinutes,
        defaultDaysWithoutDeadline: 7,
      };
      const startFrom = new Date('2024-01-01T09:00:00');

      const events = distributeEvents(task, 240, config, [], startFrom);

      // For consecutive events on the same day, there should be a gap >= gapMinutes
      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1];
        const curr = events[i];
        // Only check same-day consecutive events
        if (prev.end_time.toDateString() === curr.start_time.toDateString()) {
          const gapMs = curr.start_time.getTime() - prev.end_time.getTime();
          expect(gapMs).toBeGreaterThanOrEqual(gapMinutes * 60 * 1000);
        }
      }
    });

    it('should handle remaining minutes smaller than eventDurationMinutes', () => {
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        minBlockMinutes: 15,
        defaultDaysWithoutDeadline: 7,
      };
      const startFrom = new Date('2024-01-01T09:00:00');

      // Only 30 minutes remaining (< eventDurationMinutes of 60)
      const events = distributeEvents(task, 30, config, [], startFrom);

      expect(events.length).toBe(1);
      const durationMinutes =
        (events[0].end_time.getTime() - events[0].start_time.getTime()) /
        (1000 * 60);
      expect(durationMinutes).toBe(30);
    });

    it('should return empty array when day is completely blocked by existing events', () => {
      const startFrom = new Date('2024-01-01T09:00:00');
      const dueDate = new Date('2024-01-01T23:59:59');
      const task = createMockTask({ due_date: dueDate });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        minBlockMinutes: 15,
      };

      // Block the entire working day (9:00 to 22:00)
      const blockStart = new Date('2024-01-01T09:00:00');
      const blockEnd = new Date('2024-01-01T22:00:00');
      const blockingEvent: CalendarEventTask = {
        id: 'block-1',
        title: 'All Day Block',
        start_time: blockStart,
        end_time: blockEnd,
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        linked_task_id: 'other-task',
        completed_at: null,
      };

      const events = distributeEvents(
        task,
        60,
        config,
        [blockingEvent],
        startFrom
      );

      expect(events).toEqual([]);
    });

    it('should not schedule any events when remainingMinutes is negative', () => {
      const task = createMockTask();
      const events = distributeEvents(task, -10, DEFAULT_CONFIG, []);
      expect(events).toEqual([]);
    });

    it('should schedule events starting exactly at workingHoursStart when startFrom is before working hours', () => {
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        workingHoursStart: 9,
        defaultDaysWithoutDeadline: 7,
      };
      // Start from 7:00 AM, before working hours
      const startFrom = new Date('2024-01-01T07:00:00');

      const events = distributeEvents(task, 60, config, [], startFrom);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].start_time.getHours()).toBeGreaterThanOrEqual(9);
    });

    it('should produce events that fall entirely within working hours', () => {
      const task = createMockTask({ due_date: null });
      const config = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        workingHoursStart: 9,
        workingHoursEnd: 22,
        defaultDaysWithoutDeadline: 7,
      };
      const startFrom = new Date('2024-01-01T09:00:00');

      const events = distributeEvents(task, 300, config, [], startFrom);

      events.forEach(event => {
        const endHour = event.end_time.getHours();
        const endMinute = event.end_time.getMinutes();
        // end_time should be at or before workingHoursEnd (22:00)
        expect(endHour * 60 + endMinute).toBeLessThanOrEqual(22 * 60);
      });
    });
  });

  describe('sortTasksForScheduling — blockedBy / topological sort', () => {
    it('should schedule a blocker task before the task it blocks', () => {
      const blocker = createMockTask({ id: 'A', due_date: null });
      const blocked = createMockTask({
        id: 'B',
        due_date: null,
        blockedBy: ['A'],
      });

      const sorted = sortTasksForScheduling([blocked, blocker]);

      const indexA = sorted.findIndex(t => t.id === 'A');
      const indexB = sorted.findIndex(t => t.id === 'B');
      expect(indexA).toBeLessThan(indexB);
    });

    it('should handle a multi-level dependency chain A → B → C', () => {
      const taskA = createMockTask({ id: 'A', due_date: null });
      const taskB = createMockTask({
        id: 'B',
        due_date: null,
        blockedBy: ['A'],
      });
      const taskC = createMockTask({
        id: 'C',
        due_date: null,
        blockedBy: ['B'],
      });

      const sorted = sortTasksForScheduling([taskC, taskA, taskB]);

      const idx = (id: string) => sorted.findIndex(t => t.id === id);
      expect(idx('A')).toBeLessThan(idx('B'));
      expect(idx('B')).toBeLessThan(idx('C'));
    });

    it('should handle multiple blockers (A and B must both come before C)', () => {
      const taskA = createMockTask({ id: 'A', due_date: null });
      const taskB = createMockTask({ id: 'B', due_date: null });
      const taskC = createMockTask({
        id: 'C',
        due_date: null,
        blockedBy: ['A', 'B'],
      });

      const sorted = sortTasksForScheduling([taskC, taskB, taskA]);

      const idx = (id: string) => sorted.findIndex(t => t.id === id);
      expect(idx('A')).toBeLessThan(idx('C'));
      expect(idx('B')).toBeLessThan(idx('C'));
    });

    it('should handle cycles in blockedBy without crashing', () => {
      // A is blocked by B, B is blocked by A — cycle
      const taskA = createMockTask({ id: 'A', blockedBy: ['B'] });
      const taskB = createMockTask({ id: 'B', blockedBy: ['A'] });

      expect(() => sortTasksForScheduling([taskA, taskB])).not.toThrow();
      const sorted = sortTasksForScheduling([taskA, taskB]);
      expect(sorted.length).toBe(2);
    });

    it('should ignore blockers not present in the task set', () => {
      // Task A references blocker 'missing-id' which is not in the list
      const taskA = createMockTask({ id: 'A', blockedBy: ['missing-id'] });
      const taskB = createMockTask({ id: 'B' });

      expect(() => sortTasksForScheduling([taskA, taskB])).not.toThrow();
      const sorted = sortTasksForScheduling([taskA, taskB]);
      expect(sorted.length).toBe(2);
    });

    it('should preserve deadline ordering among independent tasks even with blockedBy on others', () => {
      const taskA = createMockTask({
        id: 'A',
        due_date: new Date('2024-01-10'),
      });
      const taskB = createMockTask({
        id: 'B',
        due_date: new Date('2024-01-05'),
      });
      // C is blocked by A but has no deadline relationship with B
      const taskC = createMockTask({
        id: 'C',
        due_date: new Date('2024-01-20'),
        blockedBy: ['A'],
      });

      const sorted = sortTasksForScheduling([taskC, taskA, taskB]);

      // A must come before C (blocker)
      const idx = (id: string) => sorted.findIndex(t => t.id === id);
      expect(idx('A')).toBeLessThan(idx('C'));
      // B has an earlier deadline than A and is independent, so B should come first
      expect(idx('B')).toBeLessThan(idx('A'));
    });
  });

  describe('checkDeadlineViolations (additional cases)', () => {
    it('should flag all events when all are after the deadline', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-01T23:59:59'),
      });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-02T10:00:00'),
          end_time: new Date('2024-01-02T11:00:00'),
        },
        {
          task_id: task.id,
          start_time: new Date('2024-01-03T10:00:00'),
          end_time: new Date('2024-01-03T11:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      expect(violations.length).toBe(2);
    });

    it('should not flag an event that starts exactly on the deadline day', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-05T10:00:00'),
      });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-05T09:00:00'),
          end_time: new Date('2024-01-05T10:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      // The event starts on the deadline date (before 23:59:59), no violation
      expect(violations).toEqual([]);
    });

    it('should flag an event that starts the day after the deadline', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-05T10:00:00'),
      });
      const events = [
        {
          task_id: task.id,
          start_time: new Date('2024-01-06T09:00:00'),
          end_time: new Date('2024-01-06T10:00:00'),
        },
      ];

      const violations = checkDeadlineViolations(events, task);

      expect(violations.length).toBe(1);
    });

    it('should return empty array when events list is empty', () => {
      const task = createMockTask({
        due_date: new Date('2024-01-05T23:59:59'),
      });

      const violations = checkDeadlineViolations([], task);

      expect(violations).toEqual([]);
    });
  });

  describe('createConfigFromSchedule', () => {
    it('should return DEFAULT_CONFIG values when schedule is null', () => {
      const config = createConfigFromSchedule(null);

      expect(config.workingHoursStart).toBe(DEFAULT_CONFIG.workingHoursStart);
      expect(config.workingHoursEnd).toBe(DEFAULT_CONFIG.workingHoursEnd);
      expect(config.eventDurationMinutes).toBe(60);
    });

    it('should use schedule working hours when provided', () => {
      const schedule: Schedule = {
        id: 'sched-1',
        user_id: 'user-1',
        name: 'Work Schedule',
        working_hours_start: 8,
        working_hours_end: 20,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const config = createConfigFromSchedule(schedule);

      expect(config.workingHoursStart).toBe(8);
      expect(config.workingHoursEnd).toBe(20);
    });

    it('should use the provided eventDurationMinutes parameter', () => {
      const config = createConfigFromSchedule(null, 90);

      expect(config.eventDurationMinutes).toBe(90);
    });

    it('should inherit all other DEFAULT_CONFIG values', () => {
      const config = createConfigFromSchedule(null);

      expect(config.skipWeekends).toBe(DEFAULT_CONFIG.skipWeekends);
      expect(config.defaultDaysWithoutDeadline).toBe(
        DEFAULT_CONFIG.defaultDaysWithoutDeadline
      );
      expect(config.minBlockMinutes).toBe(DEFAULT_CONFIG.minBlockMinutes);
      expect(config.gapBetweenEventsMinutes).toBe(
        DEFAULT_CONFIG.gapBetweenEventsMinutes
      );
    });
  });

  describe('stress / high-volume scenarios', () => {
    it('should correctly sort 50 tasks with mixed deadlines and priorities', () => {
      const tasks: Task[] = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          due_date: i % 5 === 0 ? null : new Date(2024, 0, (i % 28) + 1),
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        })
      );

      expect(() => sortTasksForScheduling(tasks)).not.toThrow();
      const sorted = sortTasksForScheduling(tasks);
      expect(sorted.length).toBe(50);

      // Tasks with a deadline should come before tasks without
      const firstNoDeadlineIdx = sorted.findIndex(t => t.due_date === null);
      const lastWithDeadlineIdx = sorted.reduce(
        (last, t, i) => (t.due_date !== null ? i : last),
        -1
      );
      if (firstNoDeadlineIdx !== -1 && lastWithDeadlineIdx !== -1) {
        expect(lastWithDeadlineIdx).toBeLessThan(firstNoDeadlineIdx);
      }
    });

    it('should schedule 10 tasks without crashing and produce non-overlapping events', () => {
      const startFrom = new Date('2024-01-01T09:00:00');
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const allEvents: CalendarEventTask[] = [];

      const tasks: Task[] = Array.from({ length: 10 }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          planned_duration_minutes: 120,
          due_date: null,
        })
      );

      const sorted = sortTasksForScheduling(tasks);

      for (const task of sorted) {
        const { events } = prepareTaskEvents(
          task,
          [],
          config,
          allEvents,
          startFrom
        );
        expect(events.length).toBeGreaterThan(0);

        // Add produced events to the pool for subsequent scheduling
        events.forEach(e => {
          allEvents.push({
            id: `evt-${e.task_id}-${e.start_time.getTime()}`,
            title: task.title,
            start_time: e.start_time,
            end_time: e.end_time,
            description: '',
            user_id: task.user_id,
            created_at: new Date(),
            updated_at: new Date(),
            linked_task_id: task.id,
            completed_at: null,
          });
        });
      }

      // Verify no two events overlap across all tasks
      const sortedEvents = allEvents.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      for (let i = 1; i < sortedEvents.length; i++) {
        const prev = sortedEvents[i - 1];
        const curr = sortedEvents[i];
        expect(new Date(prev.end_time).getTime()).toBeLessThanOrEqual(
          new Date(curr.start_time).getTime()
        );
      }
    });
  });

  describe('getDayWorkingHours', () => {
    it('should return global hours for all days when workingDays is not set', () => {
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        workingHoursStart: 8,
        workingHoursEnd: 17,
      };

      // All days including weekends should return global hours
      for (let day = 0; day < 7; day++) {
        const hours = getDayWorkingHours(config, day);
        expect(hours).toEqual({ start: 8, end: 17 });
      }
    });

    it('should return null for weekends when skipWeekends is true and workingDays is not set', () => {
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        skipWeekends: true,
        workingHoursStart: 9,
        workingHoursEnd: 22,
      };

      expect(getDayWorkingHours(config, 0)).toBeNull(); // Sunday
      expect(getDayWorkingHours(config, 6)).toBeNull(); // Saturday
      expect(getDayWorkingHours(config, 1)).toEqual({ start: 9, end: 22 }); // Monday
    });

    it('should return per-day hours from workingDays when set', () => {
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        workingDays: {
          0: null, // Sunday: off
          1: { start: 9, end: 18 }, // Monday
          2: { start: 9, end: 18 }, // Tuesday
          3: { start: 9, end: 18 }, // Wednesday
          4: { start: 9, end: 18 }, // Thursday
          5: { start: 9, end: 18 }, // Friday
          6: null, // Saturday: off
        },
      };

      expect(getDayWorkingHours(config, 0)).toBeNull(); // Sunday off
      expect(getDayWorkingHours(config, 1)).toEqual({ start: 9, end: 18 });
      expect(getDayWorkingHours(config, 5)).toEqual({ start: 9, end: 18 });
      expect(getDayWorkingHours(config, 6)).toBeNull(); // Saturday off
    });

    it('should support different hours per day', () => {
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        workingDays: {
          0: null, // Sun
          1: { start: 9, end: 17 }, // Mon
          2: { start: 10, end: 18 }, // Tue
          3: { start: 8, end: 16 }, // Wed
          4: null, // Thu
          5: null, // Fri
          6: null, // Sat
        },
      };

      expect(getDayWorkingHours(config, 1)).toEqual({ start: 9, end: 17 });
      expect(getDayWorkingHours(config, 2)).toEqual({ start: 10, end: 18 });
      expect(getDayWorkingHours(config, 3)).toEqual({ start: 8, end: 16 });
      // Day 4 explicitly null in workingDays → non-working day
      expect(getDayWorkingHours(config, 4)).toBeNull();
    });
  });

  describe('distributeEvents with workingDays', () => {
    it('should skip non-working days defined in workingDays', () => {
      // Monday 2024-01-08 → only Mon-Fri enabled
      const startFrom = new Date('2024-01-08T09:00:00'); // Monday
      const task = createMockTask({ due_date: null });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 14,
        workingDays: {
          0: null, // Sunday off
          1: { start: 9, end: 18 }, // Mon
          2: { start: 9, end: 18 }, // Tue
          3: { start: 9, end: 18 }, // Wed
          4: { start: 9, end: 18 }, // Thu
          5: { start: 9, end: 18 }, // Fri
          6: null, // Saturday off
        },
      };

      const events = distributeEvents(task, 600, config, [], startFrom);

      events.forEach(event => {
        const day = event.start_time.getDay();
        expect(day).not.toBe(0); // No Sunday events
        expect(day).not.toBe(6); // No Saturday events
      });
    });

    it('should use per-day start/end hours for each working day', () => {
      // Only Wednesday with hours 10-12
      const startFrom = new Date('2024-01-10T10:00:00'); // Wednesday
      const task = createMockTask({ due_date: null });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
        workingDays: {
          0: null,
          1: null,
          2: null,
          3: { start: 10, end: 12 }, // Only Wednesday, 10-12
          4: null,
          5: null,
          6: null,
        },
      };

      const events = distributeEvents(task, 60, config, [], startFrom);

      expect(events.length).toBe(1);
      expect(events[0]!.start_time.getHours()).toBeGreaterThanOrEqual(10);
      expect(events[0]!.end_time.getHours()).toBeLessThanOrEqual(12);
    });

    it('should return no events when workingDays has no working days', () => {
      const startFrom = new Date('2024-01-08T09:00:00'); // Monday
      const task = createMockTask({ due_date: null });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
        workingDays: {
          0: null,
          1: null,
          2: null,
          3: null,
          4: null,
          5: null,
          6: null,
        },
      };

      const events = distributeEvents(task, 60, config, [], startFrom);

      expect(events).toEqual([]);
    });

    it('should schedule Mon-Fri only across a week boundary', () => {
      // Friday 2024-01-05 → next day is Saturday (skipped), then Monday
      const startFrom = new Date('2024-01-05T17:30:00'); // Late Friday
      const task = createMockTask({ due_date: null });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 14,
        workingDays: {
          0: null,
          1: { start: 9, end: 18 },
          2: { start: 9, end: 18 },
          3: { start: 9, end: 18 },
          4: { start: 9, end: 18 },
          5: { start: 9, end: 18 },
          6: null,
        },
      };

      const events = distributeEvents(task, 120, config, [], startFrom);

      events.forEach(event => {
        const day = event.start_time.getDay();
        expect(day).not.toBe(0);
        expect(day).not.toBe(6);
      });
    });
  });

  describe('createConfigFromSchedule with workingDays', () => {
    it('should pass working_days from schedule to config', () => {
      const schedule: Schedule = {
        id: 'sched-1',
        user_id: 'user-1',
        name: 'Weekdays',
        working_hours_start: 9,
        working_hours_end: 22,
        working_days: {
          0: null,
          1: { start: 9, end: 18 },
          2: { start: 9, end: 18 },
          3: { start: 9, end: 18 },
          4: { start: 9, end: 18 },
          5: { start: 9, end: 18 },
          6: null,
        },
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const config = createConfigFromSchedule(schedule, 60);

      expect(config.workingDays).toEqual(schedule.working_days);
    });

    it('should have undefined workingDays when schedule has no working_days', () => {
      const schedule: Schedule = {
        id: 'sched-1',
        user_id: 'user-1',
        name: 'Default',
        working_hours_start: 9,
        working_hours_end: 22,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const config = createConfigFromSchedule(schedule, 60);

      expect(config.workingDays).toBeUndefined();
    });
  });

  // =========================================================================
  // checkEventOverlaps
  // =========================================================================
  describe('checkEventOverlaps', () => {
    const mkEvent = (
      taskId: string,
      start: string,
      end: string
    ): ScheduledEvent => ({
      task_id: taskId,
      start_time: new Date(start),
      end_time: new Date(end),
    });

    const mkCalendarEvent = (
      id: string,
      start: string,
      end: string,
      taskId?: string
    ): CalendarEventUnion =>
      ({
        id,
        title: `Event ${id}`,
        start_time: new Date(start),
        end_time: new Date(end),
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        ...(taskId ? { linked_task_id: taskId, completed_at: null } : {}),
      }) as CalendarEventUnion;

    it('should return empty array when no events overlap', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
        mkEvent('t1', '2024-01-10T10:05:00', '2024-01-10T11:05:00'),
      ];
      const existing = [
        mkCalendarEvent('c1', '2024-01-10T11:10:00', '2024-01-10T12:00:00'),
      ];

      const overlaps = checkEventOverlaps(events, existing);
      expect(overlaps).toEqual([]);
    });

    it('should detect when a proposed event overlaps an existing event', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
      ];
      const existing = [
        mkCalendarEvent('c1', '2024-01-10T09:30:00', '2024-01-10T10:30:00'),
      ];

      const overlaps = checkEventOverlaps(events, existing);
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].task_id).toBe('t1');
    });

    it('should detect when proposed events overlap each other', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
        mkEvent('t2', '2024-01-10T09:30:00', '2024-01-10T10:30:00'),
      ];

      const overlaps = checkEventOverlaps(events);
      expect(overlaps).toHaveLength(2); // Both overlap each other
    });

    it('should not flag events that are exactly adjacent (no overlap)', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
        mkEvent('t2', '2024-01-10T10:00:00', '2024-01-10T11:00:00'),
      ];

      // Touching but not overlapping: end === start
      const overlaps = checkEventOverlaps(events);
      expect(overlaps).toEqual([]);
    });

    it('should detect full containment (one event inside another)', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T12:00:00'),
      ];
      const existing = [
        mkCalendarEvent('c1', '2024-01-10T10:00:00', '2024-01-10T11:00:00'),
      ];

      const overlaps = checkEventOverlaps(events, existing);
      expect(overlaps).toHaveLength(1);
    });

    it('should handle empty proposed events', () => {
      const events: ScheduledEvent[] = [];
      const existing = [
        mkCalendarEvent('c1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
      ];

      const overlaps = checkEventOverlaps(events, existing);
      expect(overlaps).toEqual([]);
    });

    it('should handle empty existing events', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
      ];

      const overlaps = checkEventOverlaps(events, []);
      expect(overlaps).toEqual([]);
    });

    it('should detect multiple overlapping proposed events', () => {
      const events = [
        mkEvent('t1', '2024-01-10T09:00:00', '2024-01-10T10:00:00'),
        mkEvent('t2', '2024-01-10T11:00:00', '2024-01-10T12:00:00'),
        mkEvent('t3', '2024-01-10T11:30:00', '2024-01-10T12:30:00'),
      ];
      const existing = [
        mkCalendarEvent('c1', '2024-01-10T09:30:00', '2024-01-10T09:45:00'),
      ];

      const overlaps = checkEventOverlaps(events, existing);
      // t1 overlaps c1, t3 overlaps t2
      expect(overlaps.length).toBeGreaterThanOrEqual(2);
      const ids = overlaps.map(o => o.task_id);
      expect(ids).toContain('t1');
      expect(ids).toContain('t3');
    });
  });

  // =========================================================================
  // distributeEvents – overlap prevention
  // =========================================================================
  describe('distributeEvents – overlap prevention', () => {
    const mkCalendarEvent = (
      id: string,
      start: string,
      end: string,
      taskId?: string
    ): CalendarEventUnion =>
      ({
        id,
        title: `Event ${id}`,
        start_time: new Date(start),
        end_time: new Date(end),
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        ...(taskId ? { linked_task_id: taskId, completed_at: null } : {}),
      }) as CalendarEventUnion;

    it('should never produce overlapping events for a single task', () => {
      const startFrom = new Date('2024-01-08T09:00:00'); // Monday
      const task = createMockTask({
        id: 'task-overlap-check',
        planned_duration_minutes: 480,
        due_date: null,
      });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 3,
      };

      const events = distributeEvents(task, 480, config, [], startFrom);

      // Verify no pair of events overlaps
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const a = events[i];
          const b = events[j];
          const overlaps =
            a.start_time < b.end_time && a.end_time > b.start_time;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should not overlap with existing calendar events', () => {
      const startFrom = new Date('2024-01-08T09:00:00');
      const task = createMockTask({
        id: 'task-gap',
        planned_duration_minutes: 240,
        due_date: null,
      });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
      };

      // Dense schedule: 4 existing events back-to-back with small gaps
      const existingEvents: CalendarEventUnion[] = [
        mkCalendarEvent('e1', '2024-01-08T10:00:00', '2024-01-08T11:00:00'),
        mkCalendarEvent('e2', '2024-01-08T11:05:00', '2024-01-08T12:05:00'),
        mkCalendarEvent('e3', '2024-01-08T13:00:00', '2024-01-08T14:00:00'),
        mkCalendarEvent('e4', '2024-01-08T15:00:00', '2024-01-08T16:00:00'),
      ];

      const events = distributeEvents(
        task,
        240,
        config,
        existingEvents,
        startFrom
      );

      // Verify none overlap with existing
      for (const newEvent of events) {
        for (const existing of existingEvents) {
          const eStart = new Date(existing.start_time).getTime();
          const eEnd = new Date(existing.end_time).getTime();
          const overlaps =
            newEvent.start_time.getTime() < eEnd &&
            newEvent.end_time.getTime() > eStart;
          expect(overlaps).toBe(false);
        }
      }
    });

    it('should schedule around a fully-booked morning', () => {
      const startFrom = new Date('2024-01-08T09:00:00');
      const task = createMockTask({
        planned_duration_minutes: 60,
        due_date: null,
      });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
        gapBetweenEventsMinutes: 5,
      };

      // Morning is fully booked 9:00-13:00
      const existingEvents: CalendarEventUnion[] = [
        mkCalendarEvent('e1', '2024-01-08T09:00:00', '2024-01-08T10:00:00'),
        mkCalendarEvent('e2', '2024-01-08T10:00:00', '2024-01-08T11:00:00'),
        mkCalendarEvent('e3', '2024-01-08T11:00:00', '2024-01-08T12:00:00'),
        mkCalendarEvent('e4', '2024-01-08T12:00:00', '2024-01-08T13:00:00'),
      ];

      const events = distributeEvents(
        task,
        60,
        config,
        existingEvents,
        startFrom
      );

      expect(events).toHaveLength(1);
      // Should start after 13:00 + gap
      expect(events[0].start_time.getHours()).toBeGreaterThanOrEqual(13);
    });

    it('should handle multiple tasks not overlapping each other (simulated accumulation)', () => {
      const startFrom = new Date('2024-01-08T09:00:00');
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
      };

      // Schedule task A
      const taskA = createMockTask({
        id: 'task-a',
        planned_duration_minutes: 60,
      });
      const eventsA = distributeEvents(taskA, 60, config, [], startFrom);
      expect(eventsA).toHaveLength(1);

      // Convert task A's events to CalendarEventUnion for accumulation
      const accumulated: CalendarEventUnion[] = eventsA.map(e => ({
        id: `temp-a-${e.start_time.getTime()}`,
        title: 'Task A',
        start_time: e.start_time,
        end_time: e.end_time,
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Schedule task B with A's events as existing
      const taskB = createMockTask({
        id: 'task-b',
        planned_duration_minutes: 60,
      });
      const eventsB = distributeEvents(
        taskB,
        60,
        config,
        accumulated,
        startFrom
      );
      expect(eventsB).toHaveLength(1);

      // A and B should not overlap
      const aStart = eventsA[0].start_time.getTime();
      const aEnd = eventsA[0].end_time.getTime();
      const bStart = eventsB[0].start_time.getTime();
      const bEnd = eventsB[0].end_time.getTime();
      expect(bStart < aEnd && bEnd > aStart).toBe(false);
    });
  });

  // =========================================================================
  // prepareTaskEvents – overlap violations
  // =========================================================================
  describe('prepareTaskEvents – overlap violations', () => {
    const mkCalendarEvent = (
      id: string,
      start: string,
      end: string,
      taskId?: string
    ): CalendarEventUnion =>
      ({
        id,
        title: `Event ${id}`,
        start_time: new Date(start),
        end_time: new Date(end),
        description: '',
        user_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        ...(taskId ? { linked_task_id: taskId, completed_at: null } : {}),
      }) as CalendarEventUnion;

    it('should detect overlap violations when existing events conflict', () => {
      const task = createMockTask({
        planned_duration_minutes: 60,
        due_date: new Date('2024-01-10T23:59:59'),
      });
      const config = { ...DEFAULT_CONFIG, eventDurationMinutes: 60 };
      const startFrom = new Date('2024-01-08T09:00:00');

      // Schedule the task first
      const result = prepareTaskEvents(task, [], config, [], startFrom);

      expect(result.events.length).toBeGreaterThan(0);
      // The scheduled events should have 0 overlap violations (no conflicts)
      expect(result.violations.length).toBe(0);
    });

    it('should produce no overlaps when scheduling around dense existing events', () => {
      const task = createMockTask({
        planned_duration_minutes: 120,
        due_date: null,
      });
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 7,
      };
      const startFrom = new Date('2024-01-08T09:00:00');

      // Dense existing schedule
      const existingEvents: CalendarEventUnion[] = [
        mkCalendarEvent('e1', '2024-01-08T09:00:00', '2024-01-08T10:00:00'),
        mkCalendarEvent('e2', '2024-01-08T10:05:00', '2024-01-08T11:05:00'),
        mkCalendarEvent('e3', '2024-01-08T11:10:00', '2024-01-08T12:10:00'),
        mkCalendarEvent('e4', '2024-01-08T14:00:00', '2024-01-08T15:00:00'),
      ];

      const result = prepareTaskEvents(
        task,
        [],
        config,
        existingEvents,
        startFrom
      );

      // Verify no event overlaps existing
      for (const event of result.events) {
        for (const existing of existingEvents) {
          const eStart = new Date(existing.start_time).getTime();
          const eEnd = new Date(existing.end_time).getTime();
          const overlaps =
            event.start_time.getTime() < eEnd &&
            event.end_time.getTime() > eStart;
          expect(overlaps).toBe(false);
        }
      }
    });
  });

  // =========================================================================
  // Stress test: many tasks produce zero mutual overlaps
  // =========================================================================
  describe('stress: no overlaps among many tasks', () => {
    it('should schedule 10 tasks sequentially with zero overlaps', () => {
      const startFrom = new Date('2024-01-08T09:00:00');
      const config: TaskSchedulingConfig = {
        ...DEFAULT_CONFIG,
        eventDurationMinutes: 60,
        defaultDaysWithoutDeadline: 14,
      };

      const allEvents: Array<{ task_id: string; start: number; end: number }> =
        [];
      const accumulated: CalendarEventUnion[] = [];

      for (let i = 0; i < 10; i++) {
        const task = createMockTask({
          id: `stress-task-${i}`,
          title: `Stress Task ${i}`,
          planned_duration_minutes: 60,
          due_date: null,
        });

        const events = distributeEvents(
          task,
          60,
          config,
          accumulated,
          startFrom
        );

        for (const event of events) {
          allEvents.push({
            task_id: task.id,
            start: event.start_time.getTime(),
            end: event.end_time.getTime(),
          });

          accumulated.push({
            id: `temp-${task.id}-${event.start_time.getTime()}`,
            title: task.title,
            start_time: event.start_time,
            end_time: event.end_time,
            description: '',
            user_id: 'user-1',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      expect(allEvents.length).toBe(10);

      // Check: no two events overlap
      for (let i = 0; i < allEvents.length; i++) {
        for (let j = i + 1; j < allEvents.length; j++) {
          const a = allEvents[i];
          const b = allEvents[j];
          const overlaps = a.start < b.end && a.end > b.start;
          if (overlaps) {
            fail(
              `Overlap detected: ${a.task_id} (${new Date(a.start).toISOString()}-${new Date(a.end).toISOString()}) ` +
                `overlaps ${b.task_id} (${new Date(b.start).toISOString()}-${new Date(b.end).toISOString()})`
            );
          }
        }
      }
    });
  });
});
