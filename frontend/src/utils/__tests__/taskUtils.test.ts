import { Task, Project } from '@/types';
import {
  isTaskCompleted,
  isTaskOverdue,
  getTaskCompletedClassName,
  compareTaskPriority,
  sortTasksByPriority,
  groupTasksByProject,
} from '../taskUtils';

describe('taskUtils', () => {
  const mockTask = (overrides = {}): Task => ({
    id: '1',
    title: 'Test Task',
    description: '',
    status: 'not-started',
    priority: 'medium',
    due_date: null,
    project_id: null,
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    planned_duration_minutes: 30,
    actual_duration_minutes: 0,
    dependencies: [],
    blockedBy: [],
    ...overrides,
  });

  describe('isTaskCompleted', () => {
    it('should return true if status is completed', () => {
      expect(isTaskCompleted({ status: 'completed' })).toBe(true);
    });

    it('should return false if status is not completed', () => {
      expect(isTaskCompleted({ status: 'in-progress' })).toBe(false);
      expect(isTaskCompleted({ status: 'not-started' })).toBe(false);
    });
  });

  describe('isTaskOverdue', () => {
    it('should return false if task has no due date', () => {
      const task = mockTask({ due_date: null });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return true if due date is in the past and task is not completed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const task = mockTask({ due_date: pastDate, status: 'in-progress' });
      expect(isTaskOverdue(task)).toBe(true);
    });

    it('should return false if due date is in the past but task is completed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const task = mockTask({ due_date: pastDate, status: 'completed' });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return false if due date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const task = mockTask({ due_date: futureDate, status: 'not-started' });
      expect(isTaskOverdue(task)).toBe(false);
    });
  });

  describe('getTaskCompletedClassName', () => {
    it('should return the correct class name', () => {
      expect(getTaskCompletedClassName()).toBe(
        'line-through text-muted-foreground'
      );
    });
  });

  describe('compareTaskPriority', () => {
    it('should return negative if a has higher priority than b', () => {
      const high = mockTask({ priority: 'high' });
      const medium = mockTask({ priority: 'medium' });
      const low = mockTask({ priority: 'low' });

      expect(compareTaskPriority(high, medium)).toBeLessThan(0);
      expect(compareTaskPriority(medium, low)).toBeLessThan(0);
      expect(compareTaskPriority(high, low)).toBeLessThan(0);
    });

    it('should return positive if a has lower priority than b', () => {
      const high = mockTask({ priority: 'high' });
      const medium = mockTask({ priority: 'medium' });
      const low = mockTask({ priority: 'low' });

      expect(compareTaskPriority(medium, high)).toBeGreaterThan(0);
      expect(compareTaskPriority(low, medium)).toBeGreaterThan(0);
      expect(compareTaskPriority(low, high)).toBeGreaterThan(0);
    });

    it('should return zero if a and b have the same priority', () => {
      const task1 = mockTask({ priority: 'medium' });
      const task2 = mockTask({ priority: 'medium' });

      expect(compareTaskPriority(task1, task2)).toBe(0);
    });
  });

  describe('sortTasksByPriority', () => {
    it('should sort tasks correctly (high to low)', () => {
      const tasks = [
        mockTask({ id: '1', priority: 'low' }),
        mockTask({ id: '2', priority: 'high' }),
        mockTask({ id: '3', priority: 'medium' }),
      ];

      const sorted = sortTasksByPriority(tasks);
      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('should not mutate the original array', () => {
      const tasks = [
        mockTask({ id: '1', priority: 'low' }),
        mockTask({ id: '2', priority: 'high' }),
      ];
      const original = [...tasks];
      sortTasksByPriority(tasks);
      expect(tasks).toEqual(original);
    });
  });

  describe('groupTasksByProject', () => {
    const projects: Project[] = [
      {
        id: 'p1',
        name: 'Project 1',
        user_id: 'u1',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'p2',
        name: 'Project 2',
        user_id: 'u1',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    it('should group tasks by project correctly', () => {
      const tasks = [
        mockTask({ id: 't1', project_id: 'p1' }),
        mockTask({ id: 't2', project_id: 'p1' }),
        mockTask({ id: 't3', project_id: 'p2' }),
        mockTask({ id: 't4', project_id: null }),
      ];

      const result = groupTasksByProject(tasks, projects);

      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].id).toBe('t4');
      expect(result.byProject).toHaveLength(2);
      expect(result.byProject[0].project.id).toBe('p1');
      expect(result.byProject[0].tasks).toHaveLength(2);
      expect(result.byProject[1].project.id).toBe('p2');
      expect(result.byProject[1].tasks).toHaveLength(1);
    });

    it('should only include projects that have tasks', () => {
      const tasks = [mockTask({ id: 't1', project_id: 'p1' })];

      const result = groupTasksByProject(tasks, projects);

      expect(result.byProject).toHaveLength(1);
      expect(result.byProject[0].project.id).toBe('p1');
    });

    it('should return empty lists if no tasks', () => {
      const result = groupTasksByProject([], projects);
      expect(result.unassigned).toHaveLength(0);
      expect(result.byProject).toHaveLength(0);
    });
  });
});
