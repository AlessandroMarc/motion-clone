import type { Task, Project } from '@/types';
import {
  isTaskCompleted,
  isTaskOverdue,
  sortTasksByPriority,
  compareTaskPriority,
  groupTasksByProject,
  TASK_PRIORITY_RANK,
  TASK_COMPLETED_CLASS,
} from '../taskUtils';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'pending',
  dependencies: [],
  blockedBy: [],
  project_id: undefined,
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Project',
  description: '',
  deadline: null,
  status: 'not-started',
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('taskUtils', () => {
  // ─── TASK_PRIORITY_RANK ───────────────────────────────────────────────────────
  describe('TASK_PRIORITY_RANK', () => {
    it('should have high ranked above medium', () => {
      expect(TASK_PRIORITY_RANK.high).toBeGreaterThan(TASK_PRIORITY_RANK.medium);
    });

    it('should have medium ranked above low', () => {
      expect(TASK_PRIORITY_RANK.medium).toBeGreaterThan(TASK_PRIORITY_RANK.low);
    });
  });

  // ─── TASK_COMPLETED_CLASS ─────────────────────────────────────────────────────
  describe('TASK_COMPLETED_CLASS', () => {
    it('should include line-through', () => {
      expect(TASK_COMPLETED_CLASS).toContain('line-through');
    });
  });

  // ─── isTaskCompleted ──────────────────────────────────────────────────────────
  describe('isTaskCompleted', () => {
    it('should return true for completed status', () => {
      expect(isTaskCompleted({ status: 'completed' })).toBe(true);
    });

    it('should return false for pending status', () => {
      expect(isTaskCompleted({ status: 'pending' })).toBe(false);
    });

    it('should return false for in-progress status', () => {
      expect(isTaskCompleted({ status: 'in-progress' })).toBe(false);
    });
  });

  // ─── isTaskOverdue ────────────────────────────────────────────────────────────
  describe('isTaskOverdue', () => {
    it('should return true when due date is in the past and task is not completed', () => {
      const task = makeTask({ due_date: new Date('2000-01-01'), status: 'pending' });
      expect(isTaskOverdue(task)).toBe(true);
    });

    it('should return false when task is completed even if date is past', () => {
      const task = makeTask({ due_date: new Date('2000-01-01'), status: 'completed' });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return false when due date is in the future', () => {
      const task = makeTask({ due_date: new Date('2099-12-31'), status: 'pending' });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return false when due_date is null', () => {
      const task = makeTask({ due_date: null, status: 'pending' });
      expect(isTaskOverdue(task)).toBe(false);
    });
  });

  // ─── compareTaskPriority ─────────────────────────────────────────────────────
  describe('compareTaskPriority', () => {
    it('should sort high priority before medium', () => {
      const high = makeTask({ priority: 'high' });
      const medium = makeTask({ priority: 'medium' });
      expect(compareTaskPriority(high, medium)).toBeLessThan(0);
    });

    it('should sort medium priority before low', () => {
      const medium = makeTask({ priority: 'medium' });
      const low = makeTask({ priority: 'low' });
      expect(compareTaskPriority(medium, low)).toBeLessThan(0);
    });

    it('should return 0 for equal priorities', () => {
      const a = makeTask({ priority: 'medium' });
      const b = makeTask({ priority: 'medium' });
      expect(compareTaskPriority(a, b)).toBe(0);
    });
  });

  // ─── sortTasksByPriority ──────────────────────────────────────────────────────
  describe('sortTasksByPriority', () => {
    it('should sort tasks: high > medium > low', () => {
      const tasks = [
        makeTask({ id: 'low', priority: 'low' }),
        makeTask({ id: 'high', priority: 'high' }),
        makeTask({ id: 'med', priority: 'medium' }),
      ];
      const sorted = sortTasksByPriority(tasks);
      expect(sorted[0].id).toBe('high');
      expect(sorted[1].id).toBe('med');
      expect(sorted[2].id).toBe('low');
    });

    it('should not mutate the original array', () => {
      const tasks = [
        makeTask({ id: 'low', priority: 'low' }),
        makeTask({ id: 'high', priority: 'high' }),
      ];
      const original = [...tasks];
      sortTasksByPriority(tasks);
      expect(tasks[0].id).toBe(original[0].id);
    });

    it('should handle an empty array', () => {
      expect(sortTasksByPriority([])).toEqual([]);
    });
  });

  // ─── groupTasksByProject ──────────────────────────────────────────────────────
  describe('groupTasksByProject', () => {
    it('should separate unassigned and project tasks', () => {
      const proj = makeProject({ id: 'proj-1' });
      const tasks = [
        makeTask({ id: 't1', project_id: 'proj-1' }),
        makeTask({ id: 't2', project_id: undefined }),
        makeTask({ id: 't3', project_id: undefined }),
      ];

      const result = groupTasksByProject(tasks, [proj]);

      expect(result.unassigned).toHaveLength(2);
      expect(result.unassigned.map(t => t.id)).toContain('t2');
      expect(result.unassigned.map(t => t.id)).toContain('t3');

      expect(result.byProject).toHaveLength(1);
      expect(result.byProject[0].project.id).toBe('proj-1');
      expect(result.byProject[0].tasks).toHaveLength(1);
      expect(result.byProject[0].tasks[0].id).toBe('t1');
    });

    it('should exclude projects with no tasks from byProject', () => {
      const proj1 = makeProject({ id: 'proj-1' });
      const proj2 = makeProject({ id: 'proj-2' });
      const tasks = [makeTask({ id: 't1', project_id: 'proj-1' })];

      const result = groupTasksByProject(tasks, [proj1, proj2]);

      expect(result.byProject).toHaveLength(1);
      expect(result.byProject[0].project.id).toBe('proj-1');
    });

    it('should handle all tasks unassigned', () => {
      const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
      const result = groupTasksByProject(tasks, []);

      expect(result.unassigned).toHaveLength(2);
      expect(result.byProject).toHaveLength(0);
    });

    it('should handle empty task list', () => {
      const proj = makeProject();
      const result = groupTasksByProject([], [proj]);

      expect(result.unassigned).toHaveLength(0);
      expect(result.byProject).toHaveLength(0);
    });
  });
});
