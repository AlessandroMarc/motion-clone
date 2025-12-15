import { supabase } from '../config/supabase.js';
import type { Schedule, UserSettings } from '@shared/types.js';

export interface CreateScheduleInput {
  user_id: string;
  name?: string;
  working_hours_start?: number;
  working_hours_end?: number;
  is_default?: boolean;
}

export interface UpdateScheduleInput {
  name?: string;
  working_hours_start?: number;
  working_hours_end?: number;
  is_default?: boolean;
}

export interface CreateUserSettingsInput {
  user_id: string;
  active_schedule_id?: string | null;
}

export interface UpdateUserSettingsInput {
  active_schedule_id?: string | null;
}

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
}
