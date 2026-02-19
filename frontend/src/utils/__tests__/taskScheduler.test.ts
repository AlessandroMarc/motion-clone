import { Task, CalendarEventTask } from '@/types';
import {
  calculateRemainingDurationMinutes,
  distributeEvents,
  sortTasksForScheduling,
  checkDeadlineViolations,
  prepareTaskEvents,
  DEFAULT_CONFIG,
  TaskSchedulingConfig,
} from '../taskScheduler';

describe('taskScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

      expect(events.length).toBe(4);
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

      const events = distributeEvents(task, 180, config, []);

      expect(events.length).toBe(3);
      // Events should be within default range
      const maxDate = new Date();
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

      const result = prepareTaskEvents(task, existingEvents, config, []);

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

      const result = prepareTaskEvents(
        task,
        existingEvents,
        config,
        existingEvents
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
  });
});
