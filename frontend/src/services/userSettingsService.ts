import type { Schedule, UserSettings, OnboardingStatus, OnboardingStep } from '@/types';
import { request } from './apiClient';

class UserSettingsService {
  // Get active schedule for user (or default)
  async getActiveSchedule(userId: string): Promise<Schedule> {
    const response = await request<Schedule>(
      `/user-settings/active-schedule?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      // Return default schedule if not found
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

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Get all schedules for user
  async getUserSchedules(userId: string): Promise<Schedule[]> {
    const response = await request<Schedule[]>(
      `/user-settings/schedules?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      return [];
    }

    return response.data.map(s => ({
      ...s,
      created_at: new Date(s.created_at),
      updated_at: new Date(s.updated_at),
    }));
  }

  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const response = await request<UserSettings>(
      `/user-settings?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      return null;
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Create a new schedule
  async createSchedule(
    userId: string,
    name: string,
    workingHoursStart: number,
    workingHoursEnd: number,
    isDefault = false
  ): Promise<Schedule> {
    const response = await request<Schedule>('/user-settings/schedules', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        name,
        working_hours_start: workingHoursStart,
        working_hours_end: workingHoursEnd,
        is_default: isDefault,
      }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Update a schedule
  async updateSchedule(
    scheduleId: string,
    userId: string,
    name: string,
    workingHoursStart: number,
    workingHoursEnd: number
  ): Promise<Schedule> {
    const response = await request<Schedule>(
      `/user-settings/schedules/${scheduleId}?user_id=${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name,
          working_hours_start: workingHoursStart,
          working_hours_end: workingHoursEnd,
        }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Update user settings to set active schedule
  async setActiveSchedule(
    userId: string,
    scheduleId: string | null
  ): Promise<UserSettings> {
    const response = await request<UserSettings>(
      `/user-settings?user_id=${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          active_schedule_id: scheduleId,
        }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update active schedule');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Get onboarding status
  async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    const response = await request<OnboardingStatus>(
      `/user-settings/onboarding/status?user_id=${userId}`
    );

    if (!response.success || !response.data) {
      // Return default status if not found
      return {
        completed: false,
        step: null,
        started_at: null,
        completed_at: null,
      };
    }

    return {
      ...response.data,
      started_at: response.data.started_at ? new Date(response.data.started_at) : null,
      completed_at: response.data.completed_at ? new Date(response.data.completed_at) : null,
    };
  }

  // Update onboarding step
  async updateOnboardingStep(userId: string, step: OnboardingStep): Promise<UserSettings> {
    const response = await request<UserSettings>(
      `/user-settings/onboarding/step?user_id=${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ step }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update onboarding step');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }

  // Complete onboarding
  async completeOnboarding(userId: string): Promise<UserSettings> {
    const response = await request<UserSettings>(
      `/user-settings/onboarding/complete?user_id=${userId}`,
      {
        method: 'PUT',
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to complete onboarding');
    }

    return {
      ...response.data,
      created_at: new Date(response.data.created_at),
      updated_at: new Date(response.data.updated_at),
    };
  }
}

export const userSettingsService = new UserSettingsService();
