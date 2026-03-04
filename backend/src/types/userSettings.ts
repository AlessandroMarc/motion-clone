/**
 * User settings and schedule input types (backend API shapes).
 */

import type { DaySchedule } from '../../../shared/types.js';

export interface CreateScheduleInput {
  user_id: string;
  name?: string;
  working_hours_start?: number;
  working_hours_end?: number;
  working_days?: Record<number, DaySchedule | null>;
  is_default?: boolean;
}

export interface UpdateScheduleInput {
  name?: string;
  working_hours_start?: number;
  working_hours_end?: number;
  working_days?: Record<number, DaySchedule | null> | null;
  is_default?: boolean;
}

export interface CreateUserSettingsInput {
  user_id: string;
  active_schedule_id?: string | null;
}

export interface UpdateUserSettingsInput {
  active_schedule_id?: string | null;
}
