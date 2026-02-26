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
    for (const key of ['from', 'select', 'insert', 'update', 'upsert', 'eq', 'order']) {
      const mock = mockClient[key as keyof MockClient];
      if (mock) mock.mockReturnValue(mockClient);
    }
    service = new UserSettingsService();
  });

  // ─── getActiveSchedule ────────────────────────────────────────────────────────
  describe('getActiveSchedule', () => {
    test('should return the active schedule when active_schedule_id is set', async () => {
      const scheduleRaw = makeScheduleRaw({ id: 'schedule-1' });
      // First single: user_settings with active_schedule_id
      mockClient.single
        .mockResolvedValueOnce({ data: { active_schedule_id: 'schedule-1' }, error: null })
        // Second single: the specific schedule
        .mockResolvedValueOnce({ data: scheduleRaw, error: null });

      const result = await service.getActiveSchedule('user-1', 'token');

      expect(result?.id).toBe('schedule-1');
      expect(result?.name).toBe('Default');
      expect(result?.created_at).toBeInstanceOf(Date);
    });

    test('should fall back to default schedule when active_schedule_id is null', async () => {
      const scheduleRaw = makeScheduleRaw({ is_default: true });
      // First single: settings with no active schedule
      mockClient.single
        .mockResolvedValueOnce({ data: { active_schedule_id: null }, error: null })
        // Second single: default schedule
        .mockResolvedValueOnce({ data: scheduleRaw, error: null });

      const result = await service.getActiveSchedule('user-1');

      expect(result?.id).toBe('schedule-1');
      expect(result?.is_default).toBe(true);
    });

    test('should return hardcoded defaults when no schedule found at all', async () => {
      // First single: settings with no active schedule
      mockClient.single
        .mockResolvedValueOnce({ data: { active_schedule_id: null }, error: null })
        // Second single: no default schedule
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

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
      const schedules = [makeScheduleRaw({ id: 's1' }), makeScheduleRaw({ id: 's2' })];
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
      mockClient.single.mockResolvedValue({ data: scheduleRaw, error: null });

      const result = await service.createSchedule({ user_id: 'user-1' });

      expect(mockClient.from).toHaveBeenCalledWith('schedules');
      expect(mockClient.insert).toHaveBeenCalled();
      const insertArg = (mockClient.insert.mock?.calls?.[0] as any[][] | undefined)?.[0]?.[0];
      expect(insertArg?.name).toBe('Default');
      expect(insertArg?.working_hours_start).toBe(9);
      expect(insertArg?.working_hours_end).toBe(22);
      expect(insertArg?.is_default).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(service.createSchedule({ user_id: 'user-1' })).rejects.toThrow(
        'Failed to create schedule: Insert failed'
      );
    });
  });

  // ─── updateSchedule ───────────────────────────────────────────────────────────
  describe('updateSchedule', () => {
    test('should update and return updated schedule', async () => {
      const updated = makeScheduleRaw({ name: 'Work Hours' });
      mockClient.single.mockResolvedValue({ data: updated, error: null });

      const result = await service.updateSchedule('schedule-1', 'user-1', { name: 'Work Hours' });

      expect(mockClient.update).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'schedule-1');
      expect(mockClient.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result.name).toBe('Work Hours');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    test('should throw on database error', async () => {
      mockClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.updateSchedule('schedule-1', 'user-1', { name: 'x' })
      ).rejects.toThrow('Failed to update schedule: Update failed');
    });
  });

  // ─── deleteSchedule ───────────────────────────────────────────────────────────
  describe('deleteSchedule', () => {
    test('should throw when trying to delete the active schedule', async () => {
      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 'schedule-1' },
        error: null,
      });

      await expect(service.deleteSchedule('schedule-1', 'user-1')).rejects.toThrow(
        'Cannot delete the currently active schedule'
      );
    });

    test('should throw when deleting the last remaining schedule', async () => {
      // user_settings: active_schedule_id is different
      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 'other-id' },
        error: null,
      });

      // Count query: from('schedules').select(..., { count }).eq() → { count: 1 }
      const countEqMock = jest.fn().mockResolvedValue({ count: 1, error: null });
      const countSelectMock = jest.fn().mockReturnValue({ eq: countEqMock });

      mockClient.from
        .mockReturnValueOnce(mockClient)                // user_settings chain
        .mockReturnValueOnce({ select: countSelectMock }); // schedules count

      await expect(service.deleteSchedule('schedule-1', 'user-1')).rejects.toThrow(
        'Cannot delete your only schedule'
      );
    });

    test('should delete successfully when not active and not last', async () => {
      // user_settings: active_schedule_id is different
      mockClient.single.mockResolvedValueOnce({
        data: { active_schedule_id: 'other-id' },
        error: null,
      });

      // Count query: count = 2
      const countEqMock = jest.fn().mockResolvedValue({ count: 2, error: null });
      const countSelectMock = jest.fn().mockReturnValue({ eq: countEqMock });

      // Delete chain: .delete().eq('id', ...).eq('user_id', ...) → { error: null }
      const deleteEq2Mock = jest.fn().mockResolvedValue({ error: null });
      const deleteEq1Mock = jest.fn().mockReturnValue({ eq: deleteEq2Mock });
      const deleteChainMock = jest.fn().mockReturnValue({ eq: deleteEq1Mock });

      mockClient.from
        .mockReturnValueOnce(mockClient)                        // user_settings
        .mockReturnValueOnce({ select: countSelectMock })       // schedules count
        .mockReturnValueOnce({ delete: deleteChainMock });      // schedules delete

      await service.deleteSchedule('schedule-1', 'user-1');

      expect(deleteChainMock).toHaveBeenCalled();
      expect(deleteEq1Mock).toHaveBeenCalledWith('id', 'schedule-1');
      expect(deleteEq2Mock).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  // ─── getUserSettings ──────────────────────────────────────────────────────────
  describe('getUserSettings', () => {
    test('should return settings when found', async () => {
      const settings = makeUserSettingsRaw();
      mockClient.single.mockResolvedValue({ data: settings, error: null });

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
      const settings = makeUserSettingsRaw({ active_schedule_id: 'schedule-1' });
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
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
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
});
