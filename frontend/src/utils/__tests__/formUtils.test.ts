import {
  transformFormDataToTask,
  getPriorityColor,
  getPriorityDisplayText,
} from '../formUtils';

// Minimal TaskFormData shape matching the zod schema
const makeFormData = (overrides: Record<string, unknown> = {}) => ({
  title: 'Test Task',
  description: 'A description',
  priority: 'medium' as const,
  scheduleId: 'schedule-1',
  project_id: null as string | null | undefined,
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  blockedBy: [] as string[],
  ...overrides,
});

describe('transformFormDataToTask', () => {
  it('sets user_id from the userId param', () => {
    const result = transformFormDataToTask(makeFormData(), 'user-42');
    expect(result.user_id).toBe('user-42');
  });

  it('maps scheduleId to schedule_id', () => {
    const result = transformFormDataToTask(
      makeFormData({ scheduleId: 'sched-42' }),
      'u1'
    );
    expect(result.schedule_id).toBe('sched-42');
  });

  it('uses the title and description from form data', () => {
    const result = transformFormDataToTask(
      makeFormData({ title: 'My Task', description: 'details' }),
      'u1'
    );
    expect(result.title).toBe('My Task');
    expect(result.description).toBe('details');
  });

  it('normalizes planned_duration to 0 when negative', () => {
    const result = transformFormDataToTask(
      makeFormData({ planned_duration_minutes: -10 }),
      'u1'
    );
    expect(result.planned_duration_minutes).toBe(0);
  });

  it('keeps planned_duration as-is when positive', () => {
    const result = transformFormDataToTask(
      makeFormData({ planned_duration_minutes: 90 }),
      'u1'
    );
    expect(result.planned_duration_minutes).toBe(90);
  });

  it('clamps actual_duration to 0 when negative', () => {
    const result = transformFormDataToTask(
      makeFormData({
        actual_duration_minutes: -5,
        planned_duration_minutes: 60,
      }),
      'u1'
    );
    expect(result.actual_duration_minutes).toBe(0);
  });

  it('clamps actual_duration to planned when it exceeds planned', () => {
    const result = transformFormDataToTask(
      makeFormData({
        actual_duration_minutes: 120,
        planned_duration_minutes: 60,
      }),
      'u1'
    );
    expect(result.actual_duration_minutes).toBe(60);
  });

  it('allows actual_duration equal to planned', () => {
    const result = transformFormDataToTask(
      makeFormData({
        actual_duration_minutes: 60,
        planned_duration_minutes: 60,
      }),
      'u1'
    );
    expect(result.actual_duration_minutes).toBe(60);
  });

  it('converts dueDate string to a Date', () => {
    const result = transformFormDataToTask(
      makeFormData({ dueDate: '2025-06-15' }),
      'u1'
    );
    expect(result.due_date).toBeInstanceOf(Date);
  });

  it('normalizes dueDate to midnight (00:00:00)', () => {
    const result = transformFormDataToTask(
      makeFormData({ dueDate: '2025-06-15' }),
      'u1'
    );
    expect(result.due_date!.getHours()).toBe(0);
    expect(result.due_date!.getMinutes()).toBe(0);
    expect(result.due_date!.getSeconds()).toBe(0);
  });

  it('sets due_date to null when dueDate is empty string', () => {
    const result = transformFormDataToTask(makeFormData({ dueDate: '' }), 'u1');
    expect(result.due_date).toBeNull();
  });

  it('sets due_date to null when dueDate is undefined', () => {
    const result = transformFormDataToTask(makeFormData(), 'u1');
    expect(result.due_date).toBeNull();
  });

  it('sets project_id to undefined when null', () => {
    const result = transformFormDataToTask(
      makeFormData({ project_id: null }),
      'u1'
    );
    expect(result.project_id).toBeUndefined();
  });

  it('sets project_id to undefined when empty string', () => {
    const result = transformFormDataToTask(
      makeFormData({ project_id: '' }),
      'u1'
    );
    expect(result.project_id).toBeUndefined();
  });

  it('preserves a valid project_id', () => {
    const result = transformFormDataToTask(
      makeFormData({ project_id: 'proj-99' }),
      'u1'
    );
    expect(result.project_id).toBe('proj-99');
  });

  it('defaults blockedBy to [] when not provided', () => {
    const data = makeFormData();
    delete (data as Record<string, unknown>).blockedBy;
    const result = transformFormDataToTask(
      data as ReturnType<typeof makeFormData>,
      'u1'
    );
    expect(result.blockedBy).toEqual([]);
  });

  it('preserves blockedBy array when provided', () => {
    const result = transformFormDataToTask(
      makeFormData({ blockedBy: ['task-1', 'task-2'] }),
      'u1'
    );
    expect(result.blockedBy).toEqual(['task-1', 'task-2']);
  });
});

describe('getPriorityColor', () => {
  it('returns bg-red-500 for high', () => {
    expect(getPriorityColor('high')).toBe('bg-red-500');
  });

  it('returns bg-yellow-500 for medium', () => {
    expect(getPriorityColor('medium')).toBe('bg-yellow-500');
  });

  it('returns bg-green-500 for low', () => {
    expect(getPriorityColor('low')).toBe('bg-green-500');
  });

  it('returns bg-gray-500 for unknown priority', () => {
    expect(getPriorityColor('urgent')).toBe('bg-gray-500');
  });
});

describe('getPriorityDisplayText', () => {
  it('returns "High Priority" for high', () => {
    expect(getPriorityDisplayText('high')).toBe('High Priority');
  });

  it('returns "Medium Priority" for medium', () => {
    expect(getPriorityDisplayText('medium')).toBe('Medium Priority');
  });

  it('returns "Low Priority" for low', () => {
    expect(getPriorityDisplayText('low')).toBe('Low Priority');
  });

  it('returns "Unknown Priority" for unknown value', () => {
    expect(getPriorityDisplayText('critical')).toBe('Unknown Priority');
  });
});
