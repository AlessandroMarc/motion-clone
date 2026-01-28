/**
 * User settings and schedule input types (backend API shapes).
 */

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
