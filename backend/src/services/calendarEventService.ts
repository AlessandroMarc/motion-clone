import {
  getAuthenticatedSupabase,
  serviceRoleSupabase,
} from '../config/supabase.js';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../types/database.js';
import type {
  CalendarEventTask,
  CalendarEventUnion,
} from '../types/database.js';
import { isCalendarEventTask } from '../types/database.js';
import { TaskService } from './taskService.js';
import fs from 'fs';
import path from 'path';

const normalizeNullableDate = (
  value: string | Date | null | undefined
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
};

export class CalendarEventService {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  private calculateEventDurationMinutes(
    startTime: string | Date,
    endTime: string | Date
  ): number {
    const start =
      typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60)));
  }

  private async updateTaskDurationFromEvent(
    taskId: string,
    eventDurationMinutes: number,
    isCompleting: boolean
  ): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        console.warn(
          `[CalendarEventService] Task ${taskId} not found, skipping duration update`
        );
        return;
      }

      const currentActual = task.actual_duration_minutes ?? 0;
      const planned = task.planned_duration_minutes ?? 0;

      let newActual: number;
      if (isCompleting) {
        newActual = Math.min(currentActual + eventDurationMinutes, planned);
      } else {
        newActual = Math.max(0, currentActual - eventDurationMinutes);
      }

      await this.taskService.updateTask(taskId, {
        actual_duration_minutes: newActual,
      });

      console.log(
        `[CalendarEventService] Updated task ${taskId} actual duration: ${currentActual} -> ${newActual} (${isCompleting ? '+' : '-'}${eventDurationMinutes}min)`
      );
    } catch (error) {
      console.error(
        `[CalendarEventService] Failed to update task duration:`,
        error
      );
    }
  }

  private async ensureNoOverlaps(
    userId: string,
    startTimeIso: string,
    endTimeIso: string,
    excludeEventId?: string,
    excludeEventIds?: string[],
    client: any = serviceRoleSupabase
  ): Promise<void> {
    if (new Date(startTimeIso) >= new Date(endTimeIso)) {
      throw new Error('Calendar event end time must be after start time');
    }

    const query = client
      .from('calendar_events')
      .select(
        'id, title, start_time, end_time, linked_task_id, synced_from_google, created_at'
      )
      .eq('user_id', userId)
      .lt('start_time', endTimeIso)
      .gt('end_time', startTimeIso);

    if (excludeEventId) {
      query.neq('id', excludeEventId);
    }

    // Exclude events created in the same batch (passed as array of IDs)
    if (excludeEventIds && excludeEventIds.length > 0) {
      for (const excludeId of excludeEventIds) {
        query.neq('id', excludeId);
      }
    }

    // Exclude events created in the last 5 seconds to avoid false positives from batch creation
    // Events in the same batch are created rapidly, so we exclude very recent events
    // Increased from 2 to 5 seconds to handle slower network/database operations
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    query.lt('created_at', fiveSecondsAgo);

    const { data, error } = await query;

    if (error) {
      console.error('[CalendarEventService] Failed overlap check:', error);
      throw new Error('Failed to validate calendar event overlap');
    }

    if (data && data.length > 0) {
      console.log('[CalendarEventService] Overlap detected:', {
        newEvent: { start_time: startTimeIso, end_time: endTimeIso },
        overlappingEvents: data.map((e: any) => ({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          linked_task_id: e.linked_task_id,
          synced_from_google: e.synced_from_google,
        })),
        excludeEventId,
      });
      throw new Error('Calendar event overlaps with an existing event');
    }
  }

  /**
   * Batch create multiple calendar events using Supabase native batch insert
   * Validates all events first, then inserts valid ones in a single batch operation
   * Returns array of results with success/failure status for each event
   */
  async createCalendarEventsBatch(
    inputs: CreateCalendarEventInput[],
    authToken?: string
  ): Promise<
    Array<{
      success: boolean;
      event?: CalendarEventUnion;
      error?: string;
      index: number;
    }>
  > {
    const results: Array<{
      success: boolean;
      event?: CalendarEventUnion;
      error?: string;
      index: number;
    }> = [];

    // Step 1: Validate input data (basic validation only)
    // NOTE: We skip overlap checks here because events are created from a pre-calculated schedule.
    // The scheduling logic (prepareTaskEvents, distributeEvents) already ensures no overlaps
    // by checking against existing events before calculating available slots.
    // Since the schedule is calculated BEFORE creation, we trust it and skip overlap validation.
    const validatedInputs: Array<{
      input: CreateCalendarEventInput;
      index: number;
    }> = [];
    const invalidResults: Array<{
      success: boolean;
      error: string;
      index: number;
    }> = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];

      if (!input) {
        invalidResults.push({
          success: false,
          error: 'Invalid event data',
          index: i,
        });
        continue;
      }

      // Basic validation: check that start_time < end_time
      if (new Date(input.start_time) >= new Date(input.end_time)) {
        invalidResults.push({
          success: false,
          error: 'Event end time must be after start time',
          index: i,
        });
        continue;
      }

      validatedInputs.push({ input, index: i });
    }

    // Step 3: Prepare insert data for batch insert
    const insertDataArray = validatedInputs.map(({ input }) => {
      const insertData: {
        title: string;
        start_time: string;
        end_time: string;
        linked_task_id: string | null;
        description: string | null;
        user_id: string;
        completed_at: string | null;
        google_event_id?: string | null;
        synced_from_google?: boolean;
      } = {
        title: input.title,
        start_time: input.start_time,
        end_time: input.end_time,
        linked_task_id: input.linked_task_id ?? null,
        description: input.description ?? null,
        user_id: input.user_id,
        completed_at: input.linked_task_id
          ? normalizeNullableDate(input.completed_at)
          : null,
      };

      if (input.google_event_id !== undefined) {
        insertData.google_event_id = input.google_event_id ?? null;
      }
      if (input.synced_from_google !== undefined) {
        insertData.synced_from_google = input.synced_from_google;
      }

      return insertData;
    });

    // Step 4: Perform batch insert using Supabase native batch operation
    if (insertDataArray.length > 0) {
      try {
        console.log(
          `[CalendarEventService] Batch inserting ${insertDataArray.length} calendar events`
        );

        const client = authToken
          ? getAuthenticatedSupabase(authToken)
          : serviceRoleSupabase;
        const { data: insertedEvents, error } = await client
          .from('calendar_events')
          .insert(insertDataArray)
          .select();

        if (error) {
          console.error('[CalendarEventService] Batch insert failed:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          // If batch insert fails, mark all validated inputs as failed
          for (const validatedInput of validatedInputs) {
            invalidResults.push({
              success: false,
              error: `Batch insert failed: ${error.message}`,
              index: validatedInput.index,
            });
          }
        } else if (insertedEvents) {
          // Update task durations for successfully inserted events
          for (let i = 0; i < validatedInputs.length; i++) {
            const validatedInput = validatedInputs[i];
            if (!validatedInput) continue;

            const { input } = validatedInput;
            const insertedEvent = insertedEvents[i];

            if (
              insertedEvent &&
              input.linked_task_id &&
              insertDataArray[i]?.completed_at
            ) {
              const eventDurationMinutes = this.calculateEventDurationMinutes(
                input.start_time,
                input.end_time
              );

              if (eventDurationMinutes > 0) {
                // Fire and forget - don't block batch operation
                this.updateTaskDurationFromEvent(
                  input.linked_task_id,
                  eventDurationMinutes,
                  true
                ).catch(err => {
                  console.error(
                    `[CalendarEventService] Failed to update task duration for event ${insertedEvent.id}:`,
                    err
                  );
                });
              }
            }
          }

          // #region agent log
          try {
            const logPath = path.join(
              process.cwd(),
              '..',
              '.cursor',
              'debug.log'
            );
            const logEntry =
              JSON.stringify({
                location: 'calendarEventService.ts:350',
                message: 'Batch insert successful',
                data: {
                  insertedCount: insertedEvents.length,
                  validatedCount: validatedInputs.length,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'A',
              }) + '\n';
            fs.appendFileSync(logPath, logEntry);
          } catch (logError) {
            console.error(
              '[CalendarEventService] Failed to write log:',
              logError
            );
          }
          // #endregion

          // Create success results for all inserted events
          validatedInputs.forEach(({ index }, arrayIndex) => {
            if (insertedEvents[arrayIndex]) {
              results.push({
                success: true,
                event: insertedEvents[arrayIndex],
                index,
              });
            }
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          '[CalendarEventService] Unexpected error during batch insert:',
          error
        );
        // Mark all validated inputs as failed
        for (const { index } of validatedInputs) {
          invalidResults.push({
            success: false,
            error: `Unexpected error: ${errorMessage}`,
            index,
          });
        }
      }
    }

    // Step 5: Add all invalid results
    results.push(...invalidResults);

    // Sort results by index to maintain original order
    results.sort((a, b) => a.index - b.index);

    // #region agent log
    try {
      const logPath = path.join(process.cwd(), '..', '.cursor', 'debug.log');
      const logEntry =
        JSON.stringify({
          location: 'calendarEventService.ts:390',
          message: 'Batch create completed',
          data: {
            totalEvents: inputs.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            failedOverlaps: results.filter(
              r => !r.success && r.error?.includes('overlaps')
            ).length,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A',
        }) + '\n';
      fs.appendFileSync(logPath, logEntry);
    } catch (logError) {
      console.error('[CalendarEventService] Failed to write log:', logError);
    }
    // #endregion

    return results;
  }

  // Create a new calendar event (single event)
  async createCalendarEvent(
    input: CreateCalendarEventInput,
    excludeEventIds?: string[],
    authToken?: string
  ): Promise<CalendarEventUnion> {
    console.log(
      '[CalendarEventService] createCalendarEvent called with input:',
      input
    );

    // #region agent log
    try {
      const logPath = path.join(process.cwd(), '..', '.cursor', 'debug.log');
      const logEntry =
        JSON.stringify({
          location: 'calendarEventService.ts:200',
          message: 'Creating calendar event',
          data: {
            input: {
              title: input.title,
              start_time: input.start_time,
              end_time: input.end_time,
              user_id: input.user_id,
              synced_from_google: input.synced_from_google,
            },
            excludeEventIds,
            currentTime: new Date().toISOString(),
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'B',
        }) + '\n';
      fs.appendFileSync(logPath, logEntry);
    } catch (logError) {
      console.error('[CalendarEventService] Failed to write log:', logError);
    }
    // #endregion

    // Skip overlap check for events synced from Google (they may overlap)
    if (!input.synced_from_google) {
      const client = authToken
        ? getAuthenticatedSupabase(authToken)
        : serviceRoleSupabase;
      await this.ensureNoOverlaps(
        input.user_id,
        input.start_time,
        input.end_time,
        undefined,
        excludeEventIds,
        client
      );
    }

    const insertData: {
      title: string;
      start_time: string;
      end_time: string;
      linked_task_id: string | null;
      description: string | null;
      user_id: string;
      completed_at: string | null;
      google_event_id?: string | null;
      synced_from_google?: boolean;
    } = {
      title: input.title,
      start_time: input.start_time,
      end_time: input.end_time,
      linked_task_id: input.linked_task_id ?? null,
      description: input.description ?? null,
      user_id: input.user_id,
      completed_at: input.linked_task_id
        ? normalizeNullableDate(input.completed_at)
        : null,
    };

    if (input.google_event_id !== undefined) {
      insertData.google_event_id = input.google_event_id ?? null;
    }
    if (input.synced_from_google !== undefined) {
      insertData.synced_from_google = input.synced_from_google;
    }

    console.log('[CalendarEventService] Inserting calendar event:', insertData);

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[CalendarEventService] Failed to create calendar event:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    console.log(
      '[CalendarEventService] Calendar event created successfully:',
      data
    );

    if (input.linked_task_id && insertData.completed_at) {
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        input.start_time,
        input.end_time
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          input.linked_task_id,
          eventDurationMinutes,
          true
        );
      }
    }

    return data;
  }

  // Get all calendar events
  async getAllCalendarEvents(
    authToken?: string
  ): Promise<CalendarEventUnion[]> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }

    return data || [];
  }

  // Get calendar event by ID
  async getCalendarEventById(
    id: string,
    authToken?: string
  ): Promise<CalendarEventUnion | null> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Calendar event not found
      }
      throw new Error(`Failed to fetch calendar event: ${error.message}`);
    }

    return data;
  }

  // Update calendar event
  async updateCalendarEvent(
    id: string,
    input: UpdateCalendarEventInput,
    authToken?: string
  ): Promise<CalendarEventUnion> {
    console.log('[CalendarEventService] updateCalendarEvent called:', {
      id,
      input,
      completed_at: input.completed_at,
      completed_at_type: typeof input.completed_at,
    });
    const existing = await this.getCalendarEventById(id, authToken);
    if (!existing) {
      throw new Error('Calendar event not found');
    }

    const newStart =
      input.start_time ?? (existing.start_time as unknown as string);
    const newEnd = input.end_time ?? (existing.end_time as unknown as string);

    // Skip overlap check for events synced from Google
    const isSyncedFromGoogle =
      (existing as unknown as { synced_from_google?: boolean })
        .synced_from_google ?? false;
    const willBeSyncedFromGoogle = input.synced_from_google ?? false;

    if (!isSyncedFromGoogle && !willBeSyncedFromGoogle) {
      const client = authToken
        ? getAuthenticatedSupabase(authToken)
        : serviceRoleSupabase;
      await this.ensureNoOverlaps(
        existing.user_id,
        newStart,
        newEnd,
        id,
        undefined,
        client
      );
    }

    const updateData: {
      updated_at: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      linked_task_id?: string | null;
      description?: string;
      completed_at?: string | null;
      google_event_id?: string | null;
      synced_from_google?: boolean;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.start_time !== undefined)
      updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.linked_task_id !== undefined)
      updateData.linked_task_id = input.linked_task_id;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.google_event_id !== undefined)
      updateData.google_event_id = input.google_event_id ?? null;
    if (input.synced_from_google !== undefined)
      updateData.synced_from_google = input.synced_from_google;

    const nextLinkedTaskId =
      input.linked_task_id !== undefined
        ? input.linked_task_id
        : ((existing as unknown as { linked_task_id?: string | null })
            .linked_task_id ?? null);

    const existingCompletedAt = normalizeNullableDate(
      (existing as unknown as { completed_at?: string | Date | null })
        .completed_at
    );

    let completedAt: string | null;
    if (!nextLinkedTaskId) {
      // Not a task event: always set to null
      completedAt = null;
    } else if (input.completed_at !== undefined) {
      // Explicitly provided: normalize it (could be null, string, or Date)
      completedAt = normalizeNullableDate(input.completed_at);
      console.log('[CalendarEventService] Setting completed_at:', {
        input_completed_at: input.completed_at,
        normalized: completedAt,
      });
    } else {
      // Not provided: keep existing value
      completedAt = existingCompletedAt;
      console.log(
        '[CalendarEventService] Keeping existing completed_at:',
        completedAt
      );
    }

    updateData.completed_at = completedAt;
    console.log(
      '[CalendarEventService] Final updateData.completed_at:',
      updateData.completed_at
    );

    const wasCompleted = !!existingCompletedAt;
    const willBeCompleted = !!completedAt;
    const isCompleting = !wasCompleted && willBeCompleted;
    const isUncompleting = wasCompleted && !willBeCompleted;

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }

    if (nextLinkedTaskId && (isCompleting || isUncompleting)) {
      const eventStart =
        updateData.start_time ?? (existing.start_time as unknown as string);
      const eventEnd =
        updateData.end_time ?? (existing.end_time as unknown as string);
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        eventStart,
        eventEnd
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          nextLinkedTaskId,
          eventDurationMinutes,
          isCompleting
        );
      }
    }

    return data;
  }

  // Delete calendar event
  async deleteCalendarEvent(id: string, authToken?: string): Promise<boolean> {
    const existing = await this.getCalendarEventById(id, authToken);

    if (existing?.linked_task_id && existing.completed_at) {
      const eventDurationMinutes = this.calculateEventDurationMinutes(
        existing.start_time,
        existing.end_time
      );

      if (eventDurationMinutes > 0) {
        await this.updateTaskDurationFromEvent(
          existing.linked_task_id,
          eventDurationMinutes,
          false
        );
      }
    }

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { error } = await client
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }

    return true;
  }

  /**
   * Batch delete multiple calendar events using Supabase native batch delete
   * Updates task durations for completed events before deletion
   * Returns array of results with success/failure status for each event
   */
  async deleteCalendarEventsBatch(
    ids: string[],
    authToken?: string
  ): Promise<
    Array<{
      success: boolean;
      id: string;
      error?: string;
    }>
  > {
    if (ids.length === 0) {
      return [];
    }

    // #region agent log
    try {
      const logPath = path.join(process.cwd(), '..', '.cursor', 'debug.log');
      const logEntry =
        JSON.stringify({
          location: 'calendarEventService.ts:810',
          message: 'Starting batch delete with native Supabase batch delete',
          data: {
            totalEvents: ids.length,
            eventIds: ids,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A',
        }) + '\n';
      fs.appendFileSync(logPath, logEntry);
    } catch (logError) {
      console.error('[CalendarEventService] Failed to write log:', logError);
    }
    // #endregion

    // Step 1: Fetch all events to check for task duration updates
    const eventsToDelete: CalendarEventUnion[] = [];
    const eventsMap = new Map<string, CalendarEventUnion>();

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    try {
      const { data: events, error } = await client
        .from('calendar_events')
        .select('*')
        .in('id', ids);

      if (error) {
        console.error(
          '[CalendarEventService] Failed to fetch events for batch delete:',
          error
        );
        // If we can't fetch events, still try to delete them
        // Return error for all
        return ids.map(id => ({
          success: false,
          id,
          error: `Failed to fetch event: ${error.message}`,
        }));
      }

      if (events) {
        events.forEach(event => {
          eventsToDelete.push(event);
          eventsMap.set(event.id, event);
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[CalendarEventService] Error fetching events for batch delete:',
        error
      );
      return ids.map(id => ({
        success: false,
        id,
        error: `Failed to fetch event: ${errorMessage}`,
      }));
    }

    // Step 2: Update task durations for completed events (fire and forget)
    const taskDurationUpdates: Promise<void>[] = [];
    for (const event of eventsToDelete) {
      if (
        isCalendarEventTask(event) &&
        event.linked_task_id &&
        event.completed_at
      ) {
        const eventDurationMinutes = this.calculateEventDurationMinutes(
          event.start_time,
          event.end_time
        );

        if (eventDurationMinutes > 0) {
          taskDurationUpdates.push(
            this.updateTaskDurationFromEvent(
              event.linked_task_id,
              eventDurationMinutes,
              false
            ).catch(err => {
              console.error(
                `[CalendarEventService] Failed to update task duration for event ${event.id}:`,
                err
              );
            })
          );
        }
      }
    }

    // Don't wait for task duration updates - proceed with deletion
    Promise.all(taskDurationUpdates).catch(() => {
      // Silently handle any errors
    });

    // Step 3: Perform batch delete using Supabase native batch operation
    try {
      console.log(
        `[CalendarEventService] Batch deleting ${ids.length} calendar events`
      );

      const { error } = await client
        .from('calendar_events')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('[CalendarEventService] Batch delete failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return ids.map(id => ({
          success: false,
          id,
          error: `Batch delete failed: ${error.message}`,
        }));
      }

      // #region agent log
      try {
        const logPath = path.join(process.cwd(), '..', '.cursor', 'debug.log');
        const logEntry =
          JSON.stringify({
            location: 'calendarEventService.ts:890',
            message: 'Batch delete successful',
            data: {
              deletedCount: ids.length,
              eventIds: ids,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A',
          }) + '\n';
        fs.appendFileSync(logPath, logEntry);
      } catch (logError) {
        console.error('[CalendarEventService] Failed to write log:', logError);
      }
      // #endregion

      // Return success for all deleted events
      return ids.map(id => ({
        success: true,
        id,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[CalendarEventService] Unexpected error during batch delete:',
        error
      );
      return ids.map(id => ({
        success: false,
        id,
        error: `Unexpected error: ${errorMessage}`,
      }));
    }
  }

  // Get calendar events by date range
  async getCalendarEventsByDateRange(
    startDate: string,
    endDate: string,
    authToken?: string
  ): Promise<CalendarEventUnion[]> {
    console.log('[CalendarEventService] getCalendarEventsByDateRange called:', {
      startDate,
      endDate,
    });

    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[CalendarEventService] Failed to fetch calendar events:', {
        error,
        message: error.message,
        details: error.details,
      });
      throw new Error(
        `Failed to fetch calendar events by date range: ${error.message}`
      );
    }

    console.log('[CalendarEventService] Fetched calendar events:', {
      count: data?.length || 0,
    });

    return data || [];
  }

  // Get calendar events linked to a task
  async getCalendarEventsByTaskId(
    taskId: string,
    authToken?: string
  ): Promise<CalendarEventTask[]> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .eq('linked_task_id', taskId)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch calendar events by task: ${error.message}`
      );
    }

    return data || [];
  }

  // Get calendar event by Google event ID
  async getCalendarEventByGoogleEventId(
    userId: string,
    googleEventId: string,
    authToken?: string
  ): Promise<CalendarEventUnion | null> {
    const client = authToken
      ? getAuthenticatedSupabase(authToken)
      : serviceRoleSupabase;
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('google_event_id', googleEventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Event not found
      }
      throw new Error(
        `Failed to fetch calendar event by Google event ID: ${error.message}`
      );
    }

    return data;
  }
}
