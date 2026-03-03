import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Supabase client – methods chain and return the client or results
interface MockClient {
  from: jest.Mock<any>;
  select: jest.Mock<any>;
  insert: jest.Mock<any>;
  update: jest.Mock<any>;
  delete: jest.Mock<any>;
  upsert: jest.Mock<any>;
  eq: jest.Mock<any>;
  single: jest.Mock<any>;
  order: jest.Mock<any>;
  [key: string]: jest.Mock<any>;
}

const mockClient: MockClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  upsert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
};

// Mock supabase BEFORE importing anything that uses it
jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: mockClient,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockClient),
  serviceRoleSupabase: mockClient,
}));

const { UserSettingsService } = await import('../userSettingsService.js');

const makeScheduleRaw = (overrides: Record<string, any> = {}) => ({
  id: 'schedule-1',
  user_id: 'user-1',
  name: 'Default',
  working_hours_start: 9,
  working_hours_end: 22,
  is_default: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeUserSettingsRaw = (overrides: Record<string, any> = {}) => ({
  id: 'settings-1',
  user_id: 'user-1',
  active_schedule_id: null,
  onboarding_completed: false,
  onboarding_step: null,
  onboarding_started_at: null,
  onboarding_completed_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('UserSettingsService', () => {
  let service: InstanceType<typeof UserSettingsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of [
      'from',
      'select',
      'insert',
      'update',
      'upsert',
      'eq',
      'order',
    ]) {
      const mock = mockClient[key as keyof MockClient];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new UserSettingsService();
  });

  // ─── getActiveSchedule ────────────────────────────────────────────────────────
  describe('getActiveSchedule', () => {
    beforeEach(() => {
      // Clear schedule cache before each test
      (UserSettingsService as any).scheduleCache.clear();
    });

    test('should return the active schedule when active_schedule_id is set', async () => {
      const scheduleRaw = makeScheduleRaw({ id: 'schedule-1' });

      // Mock: from('schedules').select().eq().order().order() - fetch all schedules
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: [scheduleRaw], error: null });

      // Mock: from('user_settings').select().eq().single() - get active_schedule_id
      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 'schedule-1' },
        error: null,
      });

      const result = await service.getActiveSchedule('user-1');

      expect(result?.id).toBe('schedule-1');
      expect(result?.name).toBe('Default');
    });

    test('should fall back to default schedule when active_schedule_id is null', async () => {
      const scheduleRaw = makeScheduleRaw({ is_default: true });

      // Mock: from('schedules').select().eq().order().order() - fetch all schedules
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: [scheduleRaw], error: null });

      // Mock: from('user_settings').select().eq().single() - get active_schedule_id
      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: null },
        error: null,
      });

      const result = await service.getActiveSchedule('user-1');

      expect(result?.id).toBe('schedule-1');
      expect(result?.is_default).toBe(true);
    });

    test('should return hardcoded defaults when no schedule found at all', async () => {
      // First single: settings with no active schedule
      mockClient.single
        .mockResolvedValueOnce({
          data: { active_schedule_id: null },
          error: null,
        })
        // Second single: no default schedule
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

      const result = await service.getActiveSchedule('user-1');

      expect(result?.id).toBe('');
      expect(result?.name).toBe('Default');
      expect(result?.working_hours_start).toBe(9);
      expect(result?.working_hours_end).toBe(22);
      expect(result?.user_id).toBe('user-1');
    });
  });

  // ─── getUserSchedules ─────────────────────────────────────────────────────────
  describe('getUserSchedules', () => {
    test('should return all schedules for a user', async () => {
      const schedules = [
        makeScheduleRaw({ id: 's1' }),
        makeScheduleRaw({ id: 's2' }),
      ];
      // getUserSchedules chains: select → eq → order → order (terminal)
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: schedules, error: null });

      const result = await service.getUserSchedules('user-1', 'token');

      expect(mockClient.from).toHaveBeenCalledWith('schedules');
      expect(result).toHaveLength(2);
      expect(result[0].created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      await expect(service.getUserSchedules('user-1')).rejects.toThrow(
        'Failed to fetch schedules: DB error'
      );
    });
  });

  // ─── createSchedule ───────────────────────────────────────────────────────────
  describe('createSchedule', () => {
    test('should create a schedule with defaults', async () => {
      const scheduleRaw = makeScheduleRaw();

      // Mock the insert().select().single() chain
      mockClient.select.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({ data: scheduleRaw, error: null }),
      });

      const result = await service.createSchedule({ user_id: 'user-1' });

      expect(mockClient.from).toHaveBeenCalledWith('schedules');
      expect(mockClient.insert).toHaveBeenCalled();
      expect(result.name).toBe('Default');
      expect(result.working_hours_start).toBe(9);
      expect(result.working_hours_end).toBe(22);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      // Mock the insert().select().single() chain with error
      mockClient.select.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      });

      await expect(
        service.createSchedule({ user_id: 'user-1' })
      ).rejects.toThrow('Failed to create schedule: Insert failed');
    });
  });

  // ─── updateSchedule ───────────────────────────────────────────────────────────
  describe('updateSchedule', () => {
    test('should update and return updated schedule', async () => {
      const updated = makeScheduleRaw({ name: 'Work Hours' });
      // Set up the chain: update().eq().eq().select().single()
      mockClient.update.mockReturnValueOnce(mockClient);
      mockClient.eq.mockReturnValueOnce(mockClient);
      mockClient.eq.mockReturnValueOnce(mockClient);
      mockClient.select.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({ data: updated, error: null }),
      } as any);

      const result = await service.updateSchedule('schedule-1', 'user-1', {
        name: 'Work Hours',
      });

      expect(mockClient.update).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'schedule-1');
      expect(mockClient.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result.name).toBe('Work Hours');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      // Set up the chain: update().eq().eq().select().single() with error
      mockClient.update.mockReturnValueOnce(mockClient);
      mockClient.eq.mockReturnValueOnce(mockClient);
      mockClient.eq.mockReturnValueOnce(mockClient);
      mockClient.select.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      } as any);

      await expect(
        service.updateSchedule('schedule-1', 'user-1', { name: 'x' })
      ).rejects.toThrow('Failed to update schedule: Update failed');
    });
  });

  // ─── deleteSchedule ───────────────────────────────────────────────────────────
  describe('deleteSchedule', () => {
    test('should throw when deleting the last remaining schedule', async () => {
      // Count query: from('schedules').select(..., { count, head }).eq() → { count: 1 }
      const countEqMock = jest
        .fn()
        .mockResolvedValue({ count: 1, error: null });
      const countSelectMock = jest.fn().mockReturnValue({ eq: countEqMock });

      mockClient.from.mockReturnValueOnce({ select: countSelectMock });

      await expect(
        service.deleteSchedule('schedule-1', 'user-1')
      ).rejects.toThrow('Cannot delete your only schedule');
    });

    test('should reassign tasks and delete when not the active schedule', async () => {
      // 1. Count query → count = 2
      const countEqMock = jest
        .fn()
        .mockResolvedValue({ count: 2, error: null });
      const countSelectMock = jest.fn().mockReturnValue({ eq: countEqMock });

      // 2. Fallback query: .select().eq().neq().order().order()
      const fallbackOrder2 = jest.fn().mockResolvedValue({
        data: [{ id: 'fallback-1', is_default: true }],
      });
      const fallbackOrder1 = jest
        .fn()
        .mockReturnValue({ order: fallbackOrder2 });
      const fallbackNeq = jest.fn().mockReturnValue({ order: fallbackOrder1 });
      const fallbackEq = jest.fn().mockReturnValue({ neq: fallbackNeq });
      const fallbackSelect = jest.fn().mockReturnValue({ eq: fallbackEq });

      // 3. Task reassignment: .update().eq().eq()
      const taskEq2 = jest.fn().mockResolvedValue({ error: null });
      const taskEq1 = jest.fn().mockReturnValue({ eq: taskEq2 });
      const taskUpdate = jest.fn().mockReturnValue({ eq: taskEq1 });

      // 4. Settings check: .select().eq().single()
      const settingsSingle = jest.fn().mockResolvedValue({
        data: { active_schedule_id: 'other-id' },
        error: null,
      });
      const settingsEq = jest.fn().mockReturnValue({ single: settingsSingle });
      const settingsSelect = jest.fn().mockReturnValue({ eq: settingsEq });

      // 5. Delete: .delete().eq().eq()
      const deleteEq2 = jest.fn().mockResolvedValue({ error: null });
      const deleteEq1 = jest.fn().mockReturnValue({ eq: deleteEq2 });
      const deleteChain = jest.fn().mockReturnValue({ eq: deleteEq1 });

      mockClient.from
        .mockReturnValueOnce({ select: countSelectMock }) // 1
        .mockReturnValueOnce({ select: fallbackSelect }) // 2
        .mockReturnValueOnce({ update: taskUpdate }) // 3
        .mockReturnValueOnce({ select: settingsSelect }) // 4
        .mockReturnValueOnce({ delete: deleteChain }); // 5

      await service.deleteSchedule('schedule-1', 'user-1');

      // Verify tasks were reassigned to fallback
      expect(taskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ schedule_id: 'fallback-1' })
      );
      expect(taskEq1).toHaveBeenCalledWith('schedule_id', 'schedule-1');
      expect(taskEq2).toHaveBeenCalledWith('user_id', 'user-1');

      // Verify delete happened
      expect(deleteChain).toHaveBeenCalled();
      expect(deleteEq1).toHaveBeenCalledWith('id', 'schedule-1');
      expect(deleteEq2).toHaveBeenCalledWith('user_id', 'user-1');
    });

    test('should update active_schedule_id when deleting the active schedule', async () => {
      // 1. Count query → count = 2
      const countEqMock = jest
        .fn()
        .mockResolvedValue({ count: 2, error: null });
      const countSelectMock = jest.fn().mockReturnValue({ eq: countEqMock });

      // 2. Fallback query
      const fallbackOrder2 = jest.fn().mockResolvedValue({
        data: [{ id: 'fallback-1', is_default: true }],
      });
      const fallbackOrder1 = jest
        .fn()
        .mockReturnValue({ order: fallbackOrder2 });
      const fallbackNeq = jest.fn().mockReturnValue({ order: fallbackOrder1 });
      const fallbackEq = jest.fn().mockReturnValue({ neq: fallbackNeq });
      const fallbackSelect = jest.fn().mockReturnValue({ eq: fallbackEq });

      // 3. Task reassignment
      const taskEq2 = jest.fn().mockResolvedValue({ error: null });
      const taskEq1 = jest.fn().mockReturnValue({ eq: taskEq2 });
      const taskUpdate = jest.fn().mockReturnValue({ eq: taskEq1 });

      // 4. Settings check — active_schedule_id MATCHES the deleted one
      const settingsSingle = jest.fn().mockResolvedValue({
        data: { active_schedule_id: 'schedule-1' },
        error: null,
      });
      const settingsEq = jest.fn().mockReturnValue({ single: settingsSingle });
      const settingsSelect = jest.fn().mockReturnValue({ eq: settingsEq });

      // 5. Settings update: .update().eq()
      const settingsUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const settingsUpdateChain = jest
        .fn()
        .mockReturnValue({ eq: settingsUpdateEq });

      // 6. Delete
      const deleteEq2 = jest.fn().mockResolvedValue({ error: null });
      const deleteEq1 = jest.fn().mockReturnValue({ eq: deleteEq2 });
      const deleteChain = jest.fn().mockReturnValue({ eq: deleteEq1 });

      mockClient.from
        .mockReturnValueOnce({ select: countSelectMock }) // 1
        .mockReturnValueOnce({ select: fallbackSelect }) // 2
        .mockReturnValueOnce({ update: taskUpdate }) // 3
        .mockReturnValueOnce({ select: settingsSelect }) // 4
        .mockReturnValueOnce({ update: settingsUpdateChain }) // 5
        .mockReturnValueOnce({ delete: deleteChain }); // 6

      await service.deleteSchedule('schedule-1', 'user-1');

      // Verify active_schedule_id was updated to fallback
      expect(settingsUpdateChain).toHaveBeenCalledWith({
        active_schedule_id: 'fallback-1',
      });
      expect(settingsUpdateEq).toHaveBeenCalledWith('user_id', 'user-1');

      // Verify delete still happened
      expect(deleteChain).toHaveBeenCalled();
    });
  });

  // ─── getUserSettings ──────────────────────────────────────────────────────────
  describe('getUserSettings', () => {
    test('should return settings when found', async () => {
      const settings = makeUserSettingsRaw();
      // Set up the chain: select().eq().single()
      mockClient.select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          single: jest.fn().mockResolvedValue({ data: settings, error: null }),
        }),
      } as any);

      const result = await service.getUserSettings('user-1', 'token');

      expect(mockClient.from).toHaveBeenCalledWith('user_settings');
      expect(result?.user_id).toBe('user-1');
      expect(result?.created_at).toBeInstanceOf(Date);
    });

    test('should return null on PGRST116', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getUserSettings('user-1');

      expect(result).toBeNull();
    });

    test('should throw on other database errors', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'CONN_ERR', message: 'Connection refused' },
      });

      await expect(service.getUserSettings('user-1')).rejects.toThrow(
        'Failed to fetch user settings: Connection refused'
      );
    });
  });

  // ─── upsertUserSettings ───────────────────────────────────────────────────────
  describe('upsertUserSettings', () => {
    test('should upsert and return settings', async () => {
      const settings = makeUserSettingsRaw({
        active_schedule_id: 'schedule-1',
      });
      mockClient.single.mockResolvedValue({ data: settings, error: null });

      const result = await service.upsertUserSettings({
        user_id: 'user-1',
        active_schedule_id: 'schedule-1',
      });

      expect(mockClient.upsert).toHaveBeenCalled();
      expect(result.active_schedule_id).toBe('schedule-1');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' },
      });

      await expect(
        service.upsertUserSettings({ user_id: 'user-1' })
      ).rejects.toThrow('Failed to upsert user settings: Upsert failed');
    });
  });

  // ─── getOnboardingStatus ──────────────────────────────────────────────────────
  describe('getOnboardingStatus', () => {
    test('should return status from data when found', async () => {
      const data = {
        onboarding_completed: true,
        onboarding_step: 'task_created',
        onboarding_started_at: '2025-01-01T00:00:00Z',
        onboarding_completed_at: '2025-01-02T00:00:00Z',
      };
      mockClient.single.mockResolvedValue({ data, error: null });

      const result = await service.getOnboardingStatus('user-1', 'token');

      expect(result.completed).toBe(true);
      expect(result.step).toBe('task_created');
      expect(result.started_at).toBeInstanceOf(Date);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    test('should create new record and return defaults on PGRST116', async () => {
      const newData = {
        onboarding_completed: false,
        onboarding_step: null,
        onboarding_started_at: null,
        onboarding_completed_at: null,
      };
      // First single: PGRST116
      mockClient.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        })
        // Second single: after insert
        .mockResolvedValueOnce({ data: newData, error: null });

      const result = await service.getOnboardingStatus('user-1');

      expect(mockClient.insert).toHaveBeenCalled();
      expect(result.completed).toBe(false);
      expect(result.step).toBeNull();
      expect(result.started_at).toBeNull();
    });

    test('should throw on non-PGRST116 database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { code: 'CONN_ERR', message: 'Connection refused' },
      });

      await expect(service.getOnboardingStatus('user-1')).rejects.toThrow(
        'Failed to fetch onboarding status: Connection refused'
      );
    });
  });

  // ─── Schedule Cache Optimization Tests ────────────────────────────────────────
  describe('schedule cache - getActiveSchedule optimization', () => {
    beforeEach(() => {
      // Clear the static cache before each test
      (UserSettingsService as any).scheduleCache.clear();
    });

    test('should cache schedules and reuse them on subsequent calls (cache hit)', async () => {
      const schedules = [
        makeScheduleRaw({ id: 's1', is_default: true }),
        makeScheduleRaw({ id: 's2', is_default: false }),
      ];

      // First call: cache miss, fetch from DB
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: schedules, error: null });

      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 's1' },
        error: null,
      });

      const result1 = await service.getActiveSchedule('user-1');
      expect(result1?.id).toBe('s1');

      // Verify cache was populated
      const cacheEntry = (UserSettingsService as any).scheduleCache.get(
        'user-1'
      );
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry.schedules.length).toBe(2);

      // Second call: should use cached data
      const orderCallsBefore = mockClient.order.mock.calls.length;

      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 's1' },
        error: null,
      });

      const result2 = await service.getActiveSchedule('user-1');
      expect(result2?.id).toBe('s1');

      // Verify no additional order calls were made (cache was used)
      expect(mockClient.order.mock.calls.length).toBe(orderCallsBefore);
    });

    test('should invalidate cache when creating a schedule', async () => {
      const newSchedule = makeScheduleRaw({ id: 'new-1' });
      mockClient.single.mockResolvedValue({
        data: newSchedule,
        error: null,
      });

      // Manually set cache for user-1
      (UserSettingsService as any).scheduleCache.set('user-1', {
        schedules: [{ id: 'old' }],
        timestamp: Date.now(),
      });

      // Verify cache is set
      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        true
      );

      // Create a schedule (should invalidate cache)
      await service.createSchedule({ user_id: 'user-1' });

      // Verify cache was cleared
      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        false
      );
    });

    test('should invalidate cache when updating a schedule', async () => {
      const updated = makeScheduleRaw({ name: 'Updated' });
      mockClient.single.mockResolvedValue({
        data: updated,
        error: null,
      });

      // Set cache
      (UserSettingsService as any).scheduleCache.set('user-1', {
        schedules: [{ id: 's1', name: 'Old' }],
        timestamp: Date.now(),
      });

      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        true
      );

      // Update schedule (should invalidate)
      await service.updateSchedule('s1', 'user-1', { name: 'Updated' });

      // Cache should be cleared
      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        false
      );
    });

    test('should invalidate cache when deleting a schedule', async () => {
      // Setup: count = 2, fallback schedule, task reassignment, settings check, delete
      const countEq = jest
        .fn()
        .mockResolvedValueOnce({ count: 2, error: null });
      const countSelect = jest.fn().mockReturnValue({ eq: countEq });

      const fallbackOrder2 = jest.fn().mockResolvedValueOnce({
        data: [{ id: 'fallback-1', is_default: true }],
      });
      const fallbackOrder1 = jest
        .fn()
        .mockReturnValue({ order: fallbackOrder2 });
      const fallbackNeq = jest.fn().mockReturnValue({ order: fallbackOrder1 });
      const fallbackEq = jest.fn().mockReturnValue({ neq: fallbackNeq });
      const fallbackSelect = jest.fn().mockReturnValue({ eq: fallbackEq });

      const taskEqFinal = jest.fn().mockResolvedValueOnce({ error: null });
      const taskEq1 = jest.fn().mockReturnValue({ eq: taskEqFinal });
      const taskUpdate = jest.fn().mockReturnValue({ eq: taskEq1 });

      const settingsSingle = jest.fn().mockResolvedValueOnce({
        data: { active_schedule_id: 'other' },
        error: null,
      });
      const settingsEq = jest.fn().mockReturnValue({ single: settingsSingle });
      const settingsSelect = jest.fn().mockReturnValue({ eq: settingsEq });

      const deleteEq2 = jest.fn().mockResolvedValueOnce({ error: null });
      const deleteEq1 = jest.fn().mockReturnValue({ eq: deleteEq2 });
      const deleteChain = jest.fn().mockReturnValue({ eq: deleteEq1 });

      mockClient.from
        .mockReturnValueOnce({ select: countSelect })
        .mockReturnValueOnce({ select: fallbackSelect })
        .mockReturnValueOnce({ update: taskUpdate })
        .mockReturnValueOnce({ select: settingsSelect })
        .mockReturnValueOnce({ delete: deleteChain });

      // Set cache
      (UserSettingsService as any).scheduleCache.set('user-1', {
        schedules: [{ id: 's1', is_default: true }],
        timestamp: Date.now(),
      });

      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        true
      );

      // Delete schedule (should invalidate)
      await service.deleteSchedule('s1', 'user-1');

      // Cache should be cleared
      expect((UserSettingsService as any).scheduleCache.has('user-1')).toBe(
        false
      );
    });

    test('should treat expired cache as miss and refetch', async () => {
      const schedules = [makeScheduleRaw({ id: 's1', is_default: true })];

      // Manually set an EXPIRED cache (timestamp 10 minutes ago)
      const expiredTimestamp = Date.now() - 11 * 60 * 1000;
      (UserSettingsService as any).scheduleCache.set('user-1', {
        schedules: [{ id: 'old' }],
        timestamp: expiredTimestamp,
      });

      // Fresh DB query should be made
      mockClient.single
        .mockResolvedValueOnce({
          data: { active_schedule_id: 's1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: schedules,
          error: null,
        });
      mockClient.order
        .mockReturnValueOnce(mockClient)
        .mockResolvedValueOnce({ data: schedules, error: null });

      const result = await service.getActiveSchedule('user-1');

      expect(result?.id).toBe('s1');
      // Cache should be refreshed with new timestamp
      const cacheEntry = (UserSettingsService as any).scheduleCache.get(
        'user-1'
      );
      expect(cacheEntry?.timestamp).toBeGreaterThan(expiredTimestamp);
    });
  });
});
