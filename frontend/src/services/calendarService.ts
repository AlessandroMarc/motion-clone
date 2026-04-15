import type { CalendarEventTask, CalendarEventUnion } from '@/types';
import { isCalendarEventTask } from '@/types';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/types';
import { request } from './apiClient';
import {
  toCalendarEventUnion,
  toCalendarEventUnions,
  type UnknownRecord,
} from './transforms';

class CalendarService {
  async getAllCalendarEvents(): Promise<CalendarEventUnion[]> {
    const response = await request<CalendarEventUnion[]>('/calendar-events');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    return toCalendarEventUnions(response.data as unknown as UnknownRecord[]);
  }

  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventUnion[]> {
    const response = await request<CalendarEventUnion[]>(
      `/calendar-events?start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar events');
    }

    return toCalendarEventUnions(response.data as unknown as UnknownRecord[]);
  }

  async getCalendarEventsByTaskId(
    taskId: string
  ): Promise<CalendarEventTask[]> {
    const response = await request<CalendarEventTask[]>(
      `/calendar-events?task_id=${taskId}`
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.error || 'Failed to fetch linked calendar events'
      );
    }

    return toCalendarEventUnions(
      response.data as unknown as UnknownRecord[]
    ).filter(isCalendarEventTask) as CalendarEventTask[];
  }

  async getCalendarEventById(id: string): Promise<CalendarEventUnion> {
    const response = await request<CalendarEventUnion>(
      `/calendar-events/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch calendar event');
    }

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
  }

  async createCalendarEvent(
    input: CreateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    const payload = {
      ...input,
      completed_at:
        input.completed_at &&
        typeof input.completed_at === 'object' &&
        'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : (input.completed_at ?? null),
    };

    const response = await request<CalendarEventUnion>('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error(
          'This event overlaps an existing one. Choose a different time.'
        );
      }
      throw new Error(
        response.error || response.message || 'Failed to create calendar event'
      );
    }

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
  }

  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEventUnion> {
    const payload = {
      ...input,
      completed_at:
        input.completed_at &&
        typeof input.completed_at === 'object' &&
        'toISOString' in input.completed_at
          ? (input.completed_at as Date).toISOString()
          : input.completed_at !== undefined
            ? input.completed_at
            : undefined,
    };

    const response = await request<CalendarEventUnion>(
      `/calendar-events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    if (!response.success || !response.data) {
      if (response.error?.toLowerCase().includes('overlap')) {
        throw new Error(
          'This event overlaps an existing one. Choose a different time.'
        );
      }
      throw new Error(
        response.error || response.message || 'Failed to update calendar event'
      );
    }

    return toCalendarEventUnion(response.data as unknown as UnknownRecord);
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    const response = await request<null>(`/calendar-events/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete calendar event');
    }

    return true;
  }

  /**
   * Batch delete multiple calendar events using the backend batch endpoint
   * Returns array of results with success/failure status for each event
   */
  async deleteCalendarEventsBatch(ids: string[]): Promise<
    Array<{
      success: boolean;
      id: string;
      error?: string;
    }>
  > {
    if (ids.length === 0) {
      return [];
    }

    try {
      const response = await request<{
        results: Array<{
          success: boolean;
          id: string;
          error?: string;
        }>;
        total: number;
        successful: number;
        failed: number;
      }>('/calendar-events/batch', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error || 'Failed to delete calendar events batch'
        );
      }

      return response.data.results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // If batch delete fails entirely, return failure for all events
      return ids.map(id => ({
        success: false,
        id,
        error: errorMessage,
      }));
    }
  }

  /**
   * Batch create multiple calendar events using the backend batch endpoint
   * Returns array of results with success/failure status for each event
   * The backend handles overlap checking and excludes events in the same batch
   */
  async createCalendarEventsBatch(
    events: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id?: string;
      user_id: string;
      completed_at?: string | null;
    }>
  ): Promise<
    Array<{
      success: boolean;
      event?: CalendarEventUnion;
      error?: string;
      index: number;
    }>
  > {
    try {
      // Send all events as an array to the batch endpoint
      const response = await request<{
        results: Array<{
          success: boolean;
          event?: CalendarEventUnion;
          error?: string;
          index: number;
        }>;
        total: number;
        successful: number;
        failed: number;
      }>('/calendar-events', {
        method: 'POST',
        body: JSON.stringify(events),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error || 'Failed to create calendar events batch'
        );
      }

      // Transform events in results to CalendarEventUnion format
      const transformedResults = response.data.results.map(result => ({
        ...result,
        event: result.event
          ? toCalendarEventUnion(result.event as unknown as UnknownRecord)
          : undefined,
      }));

      return transformedResults;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // If batch creation fails entirely, return failure for all events
      return events.map((_, index) => ({
        success: false,
        error: errorMessage,
        index,
      }));
    }
  }
  /**
   * Run the auto-schedule algorithm on the backend.
   * The backend fetches tasks, events and schedules, computes the optimal
   * schedule and applies the diff (creates / deletes calendar events).
   *
   * Returns a summary of what changed.
   */
  async runAutoSchedule(): Promise<{
    unchanged: boolean;
    eventsCreated: number;
    eventsDeleted: number;
    violations: number;
  }> {
    const response = await request<{
      unchanged: boolean;
      eventsCreated: number;
      eventsDeleted: number;
      violations: number;
    }>('/auto-schedule/run', {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to run auto-schedule');
    }

    return response.data;
  }

  /**
   * Create a day-block from a chosen time to end of working hours, then
   * immediately re-run auto-schedule so remaining tasks are pushed past it.
   */
  async createDayBlock(
    date: string,
    fromTime: string
  ): Promise<{
    day_block: CalendarEventUnion;
    schedule_result: {
      unchanged: boolean;
      eventsCreated: number;
      eventsDeleted: number;
      violations: number;
    };
  }> {
    const response = await request<{
      day_block: UnknownRecord;
      schedule_result: {
        unchanged: boolean;
        eventsCreated: number;
        eventsDeleted: number;
        violations: number;
      };
    }>('/day-blocks', {
      method: 'POST',
      body: JSON.stringify({ date, from_time: fromTime }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create day block');
    }

    return {
      day_block: toCalendarEventUnion(response.data.day_block),
      schedule_result: response.data.schedule_result,
    };
  }

  /**
   * Preview what would happen if a day-block were created, without actually
   * creating it. Returns the list of tasks that would be moved.
   */
  async previewDayBlock(
    date: string,
    fromTime: string
  ): Promise<{
    tasksToMove: Array<{
      task: { id: string; title: string };
      currentEvent: CalendarEventTask;
      proposedTime: { start: Date; end: Date } | null;
    }>;
    totalEventsCreated: number;
    totalEventsDeleted: number;
    violations: number;
    /** ISO string of the computed block end time (timezone-safe). */
    blockEndTime: string;
    /** True when the day is explicitly marked non-working in the user's schedule. */
    isNonWorkingDay: boolean;
  }> {
    const response = await request<{
      tasksToMove: Array<{
        task: { id: string; title: string };
        currentEvent: UnknownRecord;
        proposedTime: { start: string; end: string } | null;
      }>;
      totalEventsCreated: number;
      totalEventsDeleted: number;
      violations: number;
      blockEndTime: string;
      isNonWorkingDay: boolean;
    }>('/day-blocks/preview', {
      method: 'POST',
      body: JSON.stringify({ date, from_time: fromTime }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to preview day block');
    }

    return {
      tasksToMove: response.data.tasksToMove.map(t => ({
        task: t.task,
        currentEvent: t.currentEvent as unknown as CalendarEventTask,
        proposedTime: t.proposedTime
          ? {
              start: new Date(t.proposedTime.start),
              end: new Date(t.proposedTime.end),
            }
          : null,
      })),
      totalEventsCreated: response.data.totalEventsCreated,
      totalEventsDeleted: response.data.totalEventsDeleted,
      violations: response.data.violations,
      blockEndTime: response.data.blockEndTime,
      isNonWorkingDay: response.data.isNonWorkingDay,
    };
  }

  /**
   * Delete a day-block and re-run auto-schedule so tasks reclaim the freed window.
   */
  async deleteDayBlock(id: string): Promise<{
    schedule_result: {
      unchanged: boolean;
      eventsCreated: number;
      eventsDeleted: number;
      violations: number;
    };
  }> {
    const response = await request<{
      schedule_result: {
        unchanged: boolean;
        eventsCreated: number;
        eventsDeleted: number;
        violations: number;
      };
    }>(`/day-blocks/${id}`, { method: 'DELETE' });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to delete day block');
    }

    return response.data;
  }

  /** Returns pinned tasks whose events would be moved/deleted by auto-schedule. */
  async getPinnedTasksPreview(): Promise<Array<{ id: string; title: string }>> {
    const response = await request<{
      pinnedTasks: Array<{ id: string; title: string }>;
    }>('/auto-schedule/pinned-preview');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch pinned preview');
    }

    return response.data.pinnedTasks;
  }
}

export const calendarService = new CalendarService();
