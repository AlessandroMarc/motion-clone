import {
  TASK_PRIORITY_RANK,
  compareTaskPriority,
  sortByPriority,
} from '../taskPriority';

describe('TASK_PRIORITY_RANK', () => {
  it('assigns high > medium > low', () => {
    expect(TASK_PRIORITY_RANK.high).toBeGreaterThan(TASK_PRIORITY_RANK.medium);
    expect(TASK_PRIORITY_RANK.medium).toBeGreaterThan(TASK_PRIORITY_RANK.low);
  });
});

describe('compareTaskPriority', () => {
  it('returns negative when a has higher priority than b', () => {
    expect(
      compareTaskPriority({ priority: 'high' }, { priority: 'low' })
    ).toBeLessThan(0);
  });

  it('returns positive when a has lower priority than b', () => {
    expect(
      compareTaskPriority({ priority: 'low' }, { priority: 'high' })
    ).toBeGreaterThan(0);
  });

  it('returns 0 for equal priorities', () => {
    expect(
      compareTaskPriority({ priority: 'medium' }, { priority: 'medium' })
    ).toBe(0);
  });
});

describe('sortByPriority', () => {
  it('sorts items high → medium → low', () => {
    const items = [
      { priority: 'low' as const, id: 1 },
      { priority: 'high' as const, id: 2 },
      { priority: 'medium' as const, id: 3 },
    ];
    const sorted = sortByPriority(items);
    expect(sorted.map(i => i.priority)).toEqual(['high', 'medium', 'low']);
  });

  it('does not mutate the original array', () => {
    const items = [
      { priority: 'low' as const },
      { priority: 'high' as const },
    ];
    const sorted = sortByPriority(items);
    expect(sorted).not.toBe(items);
    expect(items[0]!.priority).toBe('low');
  });

  it('preserves extra properties on items', () => {
    const items = [
      { priority: 'medium' as const, name: 'A' },
      { priority: 'high' as const, name: 'B' },
    ];
    const sorted = sortByPriority(items);
    expect(sorted[0]).toEqual({ priority: 'high', name: 'B' });
  });
});
