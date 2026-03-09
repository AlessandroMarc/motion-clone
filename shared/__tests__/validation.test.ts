import {
  TASK_TITLE_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_DURATION_MIN_MINUTES,
  validateTaskTitle,
  validateTaskDescription,
  validateTaskPriority,
  validatePlannedDuration,
} from '../validation';

describe('validateTaskTitle', () => {
  it('returns null for valid titles', () => {
    expect(validateTaskTitle('Fix bug')).toBeNull();
    expect(validateTaskTitle('A')).toBeNull();
  });

  it('returns error for empty title', () => {
    expect(validateTaskTitle('')).toBe('Title is required');
  });

  it('returns error for title exceeding max length', () => {
    const longTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH + 1);
    expect(validateTaskTitle(longTitle)).toContain('at most');
  });

  it('accepts title at exact max length', () => {
    const maxTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH);
    expect(validateTaskTitle(maxTitle)).toBeNull();
  });
});

describe('validateTaskDescription', () => {
  it('returns null for valid descriptions', () => {
    expect(validateTaskDescription('')).toBeNull();
    expect(validateTaskDescription('Some description')).toBeNull();
  });

  it('returns error for description exceeding max length', () => {
    const longDesc = 'a'.repeat(TASK_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateTaskDescription(longDesc)).toContain('at most');
  });
});

describe('validateTaskPriority', () => {
  it('returns null for valid priorities', () => {
    for (const p of TASK_PRIORITIES) {
      expect(validateTaskPriority(p)).toBeNull();
    }
  });

  it('returns error for invalid priority', () => {
    expect(validateTaskPriority('urgent')).toContain('must be one of');
    expect(validateTaskPriority('')).toContain('must be one of');
  });
});

describe('validatePlannedDuration', () => {
  it('returns null for valid durations', () => {
    expect(validatePlannedDuration(1)).toBeNull();
    expect(validatePlannedDuration(60)).toBeNull();
    expect(validatePlannedDuration(480)).toBeNull();
  });

  it('returns error for zero or negative duration', () => {
    expect(validatePlannedDuration(0)).toContain('at least');
    expect(validatePlannedDuration(-1)).toContain('at least');
  });
});

describe('constants', () => {
  it('exports expected constant values', () => {
    expect(TASK_TITLE_MAX_LENGTH).toBe(100);
    expect(TASK_DESCRIPTION_MAX_LENGTH).toBe(4000);
    expect(TASK_DURATION_MIN_MINUTES).toBe(1);
    expect(TASK_PRIORITIES).toEqual(['low', 'medium', 'high']);
  });
});
