import { supabase, getAuthenticatedSupabase } from '../config/supabase.js';
import type {
  Schedule,
  UserSettings,
  OnboardingStatus,
  OnboardingStep,
} from '../types/database.js';
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
} from '../types/userSettings.js';
import { autoScheduleTriggerQueue } from './autoScheduleTriggerQueue.js';

export class UserSettingsService {
  // Schedule cache: Map<userId, { schedules, activeScheduleId, timestamp }>
  // Caches both schedules and the user's active_schedule_id to avoid an extra
  // user_settings query on every cache hit.
  private static scheduleCache = new Map<
    string,
    { schedules: Schedule[]; activeScheduleId: string | null; timestamp: number }
  >();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_ENTRIES = 10_000;

  private static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL_MS;
  }

  private static enforceCacheBound(): void {
    if (this.scheduleCache.size < this.MAX_CACHE_ENTRIES) return;
    // Evict the oldest 10% of entries to reduce frequent iteration
    const evictCount = Math.max(1, Math.floor(this.MAX_CACHE_ENTRIES * 0.1));
    const entries = Array.from(this.scheduleCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      this.scheduleCache.delete(entries[i]![0]);
    }
  }

  // Clear schedule cache for a specific user (call on any schedule change)
  static invalidateScheduleCache(userId: string): void {
    UserSettingsService.scheduleCache.delete(userId);
    console.log(`[UserSettingsService] Cache invalidated for user ${userId}`);
  }
  // Get active schedule for a user (or default if none is active).
  // Cache hit: zero DB queries — both schedules and active_schedule_id are cached.
  // Cache miss: fetches schedules + user_settings in parallel (2 queries → 1 round-trip).
  async getActiveSchedule(
    userId: string,
    token?: string
  ): Promise<Schedule | null> {
    const startTime = Date.now();

    // Cache hit — no DB queries needed
    const cached = UserSettingsService.scheduleCache.get(userId);
    if (cached && UserSettingsService.isCacheValid(cached.timestamp)) {
      let schedule = cached.schedules.find(
        s => s.id === cached.activeScheduleId
      );
      if (!schedule) {
        schedule = cached.schedules.find(s => s.is_default);
      }
      if (schedule) {
        const duration = Date.now() - startTime;
        if (process.env.PERF_LOGGING === 'true') {
          console.log(
            `[PERF] UserSettingsService › getActiveSchedule (cache hit): ${duration}ms`
          );
        }
        return schedule;
      }
    }

    // Cache miss — fetch schedules + user_settings in parallel
    const client = token ? getAuthenticatedSupabase(token) : supabase;

    const [schedulesResult, settingsResult] = await Promise.all([
      client
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      client
        .from('user_settings')
        .select('active_schedule_id')
        .eq('user_id', userId)
        .single(),
    ]);

    if (schedulesResult.error) {
      throw new Error(
        `Failed to fetch schedules: ${schedulesResult.error.message}`
      );
    }
    if (
      settingsResult.error &&
      settingsResult.error.code !== 'PGRST116'
    ) {
      throw new Error(
        `Failed to fetch user settings: ${settingsResult.error.message}`
      );
    }

    const schedules = (schedulesResult.data || []).map(s => ({
      ...s,
      created_at: new Date(s.created_at),
      updated_at: new Date(s.updated_at),
    }));

    const activeScheduleId =
      settingsResult.data?.active_schedule_id ?? null;

    // Populate cache
    UserSettingsService.enforceCacheBound();
    UserSettingsService.scheduleCache.set(userId, {
      schedules,
      activeScheduleId,
      timestamp: Date.now(),
    });

    let schedule: Schedule | null = null;
    if (activeScheduleId) {
      schedule = schedules.find(s => s.id === activeScheduleId) || null;
    }
    if (!schedule) {
      schedule = schedules.find(s => s.is_default) || null;
    }
    if (!schedule) {
      return {
        id: '',
        user_id: userId,
        name: 'Default',
        working_hours_start: 9,
        working_hours_end: 18,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.warn(
        `[PERF] UserSettingsService › getActiveSchedule (cache miss): ${duration}ms ⚠️`
      );
    }

    return schedule;
  }

  // Get all schedules for a user — uses cache when warm.
  async getUserSchedules(userId: string, token?: string): Promise<Schedule[]> {
    const cached = UserSettingsService.scheduleCache.get(userId);
    if (cached && UserSettingsService.isCacheValid(cached.timestamp)) {
      return cached.schedules;
    }

    const startTime = Date.now();
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    const schedules = (data || []).map(s => ({
      ...s,
      created_at: new Date(s.created_at),
      updated_at: new Date(s.updated_at),
    }));

    // Populate cache. Reuse a previously-cached activeScheduleId only if that
    // entry is still within the TTL — otherwise fall back to null so a stale
    // ID from an expired entry is never resurrected.
    const prev = UserSettingsService.scheduleCache.get(userId);
    const prevActiveScheduleId =
      prev && UserSettingsService.isCacheValid(prev.timestamp)
        ? prev.activeScheduleId
        : null;
    UserSettingsService.enforceCacheBound();
    UserSettingsService.scheduleCache.set(userId, {
      schedules,
      activeScheduleId: prevActiveScheduleId,
      timestamp: Date.now(),
    });

    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.warn(
        `[PERF] UserSettingsService › getUserSchedules (cache miss): ${duration}ms ⚠️`
      );
    }

    return schedules;
  }

  // Create a new schedule
  async createSchedule(
    input: CreateScheduleInput,
    token?: string
  ): Promise<Schedule> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('schedules')
      .insert([
        {
          user_id: input.user_id,
          name: input.name || 'Default',
          working_hours_start: input.working_hours_start ?? 9,
          working_hours_end: input.working_hours_end ?? 22,
          working_days: input.working_days ?? null,
          is_default: input.is_default ?? false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    // Invalidate cache since schedules changed
    UserSettingsService.invalidateScheduleCache(input.user_id);

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Update a schedule
  async updateSchedule(
    scheduleId: string,
    userId: string,
    input: UpdateScheduleInput,
    token?: string
  ): Promise<Schedule> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('schedules')
      .update({
        name: input.name,
        working_hours_start: input.working_hours_start,
        working_hours_end: input.working_hours_end,
        working_days:
          input.working_days !== undefined ? input.working_days : undefined,
        is_default: input.is_default,
      })
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    // Invalidate cache since schedules changed
    UserSettingsService.invalidateScheduleCache(userId);

    // Trigger auto-schedule asynchronously (fire-and-forget)
    if (token) {
      autoScheduleTriggerQueue.trigger(userId, token);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Delete a schedule — reassigns orphaned tasks to the fallback schedule.
  async deleteSchedule(
    scheduleId: string,
    userId: string,
    token?: string
  ): Promise<void> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;

    // Prevent deleting the last remaining schedule
    const { count } = await client
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count !== null && count <= 1) {
      throw new Error(
        'Cannot delete your only schedule. You must have at least one schedule.'
      );
    }

    // Determine a fallback schedule (prefer the default, otherwise first non-deleted one)
    const { data: fallbackSchedules, error: fallbackError } = await client
      .from('schedules')
      .select('id, is_default')
      .eq('user_id', userId)
      .neq('id', scheduleId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (fallbackError) {
      throw new Error(
        `Failed to resolve fallback schedule: ${fallbackError.message}`
      );
    }

    const fallbackId = fallbackSchedules?.[0]?.id;
    if (!fallbackId) {
      throw new Error(
        'No fallback schedule available. You must have at least one other schedule.'
      );
    }

    // Reassign any tasks referencing the doomed schedule
    const { error: reassignError } = await client
      .from('tasks')
      .update({ schedule_id: fallbackId, updated_at: new Date().toISOString() })
      .eq('schedule_id', scheduleId)
      .eq('user_id', userId);

    if (reassignError) {
      throw new Error(`Failed to reassign tasks: ${reassignError.message}`);
    }

    // If the deleted schedule was the active one, switch to the fallback
    const { data: settings, error: settingsError } = await client
      .from('user_settings')
      .select('active_schedule_id')
      .eq('user_id', userId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw new Error(`Failed to read user settings: ${settingsError.message}`);
    }

    if (settings?.active_schedule_id === scheduleId) {
      const { error: updateSettingsError } = await client
        .from('user_settings')
        .update({ active_schedule_id: fallbackId })
        .eq('user_id', userId);
      if (updateSettingsError) {
        throw new Error(
          `Failed to update active schedule: ${updateSettingsError.message}`
        );
      }
    }

    // Delete the schedule
    const { error } = await client
      .from('schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }

    // Invalidate cache since schedules changed
    UserSettingsService.invalidateScheduleCache(userId);
  }

  // Get user settings
  async getUserSettings(
    userId: string,
    token?: string
  ): Promise<UserSettings | null> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Settings not found
      }
      throw new Error(`Failed to fetch user settings: ${error.message}`);
    }

    return data
      ? {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        }
      : null;
  }

  // Create or update user settings (upsert)
  async upsertUserSettings(
    input: CreateUserSettingsInput,
    token?: string
  ): Promise<UserSettings> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .upsert(
        {
          user_id: input.user_id,
          active_schedule_id: input.active_schedule_id ?? null,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert user settings: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Update user settings
  async updateUserSettings(
    userId: string,
    input: UpdateUserSettingsInput,
    token?: string
  ): Promise<UserSettings> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .update({
        active_schedule_id: input.active_schedule_id,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user settings: ${error.message}`);
    }

    // Invalidate cache so the new active_schedule_id is picked up immediately
    UserSettingsService.invalidateScheduleCache(userId);

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Get onboarding status for a user
  async getOnboardingStatus(
    userId: string,
    token?: string
  ): Promise<OnboardingStatus> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .select(
        'onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at'
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default record and return default status
        try {
          const { data: newData, error: createError } = await client
            .from('user_settings')
            .insert([
              {
                user_id: userId,
                onboarding_completed: false,
                onboarding_step: null,
              },
            ])
            .select(
              'onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at'
            )
            .single();

          if (createError) {
            // If creation fails, still return default status
            console.error('Failed to create user_settings:', createError);
            return {
              completed: false,
              step: null,
              started_at: null,
              completed_at: null,
            };
          }

          return {
            completed: newData?.onboarding_completed ?? false,
            step: (newData?.onboarding_step as OnboardingStep) ?? null,
            started_at: newData?.onboarding_started_at
              ? new Date(newData.onboarding_started_at)
              : null,
            completed_at: newData?.onboarding_completed_at
              ? new Date(newData.onboarding_completed_at)
              : null,
          };
        } catch (createErr) {
          // If creation fails, return default status
          console.error('Failed to create user_settings:', createErr);
          return {
            completed: false,
            step: null,
            started_at: null,
            completed_at: null,
          };
        }
      }
      throw new Error(`Failed to fetch onboarding status: ${error.message}`);
    }

    return {
      completed: data?.onboarding_completed ?? false,
      step: (data?.onboarding_step as OnboardingStep) ?? null,
      started_at: data?.onboarding_started_at
        ? new Date(data.onboarding_started_at)
        : null,
      completed_at: data?.onboarding_completed_at
        ? new Date(data.onboarding_completed_at)
        : null,
    };
  }

  // Update onboarding step
  async updateOnboardingStep(
    userId: string,
    step: OnboardingStep,
    token?: string
  ): Promise<UserSettings> {
    // First, ensure user_settings exists
    const existingSettings = await this.getUserSettings(userId, token);

    const updateData: {
      onboarding_step: OnboardingStep;
      onboarding_started_at?: string;
    } = {
      onboarding_step: step,
    };

    // Set started_at if this is the first step
    if (!existingSettings?.onboarding_started_at && step !== null) {
      updateData.onboarding_started_at = new Date().toISOString();
    }

    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          ...updateData,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update onboarding step: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      onboarding_started_at: data.onboarding_started_at
        ? new Date(data.onboarding_started_at)
        : null,
      onboarding_completed_at: data.onboarding_completed_at
        ? new Date(data.onboarding_completed_at)
        : null,
    };
  }

  // Complete onboarding
  async completeOnboarding(
    userId: string,
    token?: string
  ): Promise<UserSettings> {
    const client = token ? getAuthenticatedSupabase(token) : supabase;
    const { data, error } = await client
      .from('user_settings')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // If settings don't exist, create them
      if (error.code === 'PGRST116') {
        return await this.upsertUserSettings(
          {
            user_id: userId,
          },
          token
        ).then(() => this.completeOnboarding(userId, token));
      }
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      onboarding_started_at: data.onboarding_started_at
        ? new Date(data.onboarding_started_at)
        : null,
      onboarding_completed_at: data.onboarding_completed_at
        ? new Date(data.onboarding_completed_at)
        : null,
    };
  }
}
