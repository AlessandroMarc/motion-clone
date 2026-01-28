import { supabase } from '../config/supabase.js';
import type { Schedule, UserSettings, OnboardingStatus, OnboardingStep } from '../types/database.js';
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
} from '../types/userSettings.js';

export class UserSettingsService {
  // Get active schedule for a user (or default if none is active)
  async getActiveSchedule(userId: string): Promise<Schedule | null> {
    // First, get user settings to see if there's an active schedule
    const { data: settings } = await supabase
      .from('user_settings')
      .select('active_schedule_id')
      .eq('user_id', userId)
      .single();

    let schedule: Schedule | null = null;

    // If there's an active schedule, get it
    if (settings?.active_schedule_id) {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', settings.active_schedule_id)
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        schedule = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        };
      }
    }

    // If no active schedule or it doesn't exist, get the default schedule
    if (!schedule) {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (!error && data) {
        schedule = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        };
      }
    }

    // If still no schedule, return default values (will be created on first use)
    if (!schedule) {
      return {
        id: '',
        user_id: userId,
        name: 'Default',
        working_hours_start: 9,
        working_hours_end: 22,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    return schedule;
  }

  // Get all schedules for a user
  async getUserSchedules(userId: string): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    return (data || []).map(s => ({
      ...s,
      created_at: new Date(s.created_at),
      updated_at: new Date(s.updated_at),
    }));
  }

  // Create a new schedule
  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .insert([
        {
          user_id: input.user_id,
          name: input.name || 'Default',
          working_hours_start: input.working_hours_start ?? 9,
          working_hours_end: input.working_hours_end ?? 22,
          is_default: input.is_default ?? false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

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
    input: UpdateScheduleInput
  ): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        name: input.name,
        working_hours_start: input.working_hours_start,
        working_hours_end: input.working_hours_end,
        is_default: input.is_default,
      })
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
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
    input: CreateUserSettingsInput
  ): Promise<UserSettings> {
    const { data, error } = await supabase
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
    input: UpdateUserSettingsInput
  ): Promise<UserSettings> {
    const { data, error } = await supabase
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

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  // Get onboarding status for a user
  async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default record and return default status
        try {
          const { data: newData, error: createError } = await supabase
            .from('user_settings')
            .insert([
              {
                user_id: userId,
                onboarding_completed: false,
                onboarding_step: null,
              },
            ])
            .select('onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at')
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
            started_at: newData?.onboarding_started_at ? new Date(newData.onboarding_started_at) : null,
            completed_at: newData?.onboarding_completed_at ? new Date(newData.onboarding_completed_at) : null,
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
      started_at: data?.onboarding_started_at ? new Date(data.onboarding_started_at) : null,
      completed_at: data?.onboarding_completed_at ? new Date(data.onboarding_completed_at) : null,
    };
  }

  // Update onboarding step
  async updateOnboardingStep(userId: string, step: OnboardingStep): Promise<UserSettings> {
    // First, ensure user_settings exists
    const existingSettings = await this.getUserSettings(userId);
    
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

    const { data, error } = await supabase
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
      onboarding_started_at: data.onboarding_started_at ? new Date(data.onboarding_started_at) : null,
      onboarding_completed_at: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : null,
    };
  }

  // Complete onboarding
  async completeOnboarding(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
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
        return await this.upsertUserSettings({
          user_id: userId,
        }).then(() => this.completeOnboarding(userId));
      }
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      onboarding_started_at: data.onboarding_started_at ? new Date(data.onboarding_started_at) : null,
      onboarding_completed_at: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : null,
    };
  }
}
