/**
 * Cleanup utility for integration tests.
 *
 * Uses the Supabase service-role client (bypasses RLS) to delete ALL data
 * belonging to the test user. Called in both globalSetup (pre-run) and
 * globalTeardown (post-run) so the production database stays clean.
 *
 * Deletion order respects foreign-key constraints.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function throwOnError(
  result: { error: any },
  context: string
): Promise<void> {
  if (result.error) {
    throw new Error(`[cleanup] ${context}: ${result.error.message}`);
  }
}

export async function cleanupTestUser(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  console.log(`[cleanup] Wiping data for user ${userId}…`);

  // 1. Calendar events (references tasks via linked_task_id)
  const eventsResult = await admin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId);
  await throwOnError(eventsResult, 'calendar_events');

  // 2. Milestones (references projects)
  const milestonesResult = await admin
    .from('milestones')
    .delete()
    .eq('user_id', userId);
  await throwOnError(milestonesResult, 'milestones');

  // 3. Tasks (references projects and schedules)
  const tasksResult = await admin.from('tasks').delete().eq('user_id', userId);
  await throwOnError(tasksResult, 'tasks');

  // 4. Projects
  const projectsResult = await admin
    .from('projects')
    .delete()
    .eq('user_id', userId);
  await throwOnError(projectsResult, 'projects');

  // 5. Schedules — ensure default exists, then delete non-default schedules.
  //    The default schedule is needed for the app to function.
  const { data: schedules, error: schedulesFetchErr } = await admin
    .from('schedules')
    .select('id,is_default')
    .eq('user_id', userId);
  await throwOnError({ error: schedulesFetchErr }, 'schedules fetch');

  const hasDefault = schedules?.some(s => s.is_default);
  if (!hasDefault && schedules && schedules.length > 0) {
    // Create a default schedule if none exists
    const { error: upsertErr } = await admin.from('schedules').upsert({
      id: `default-${userId}`,
      user_id: userId,
      name: 'Default',
      working_hours_start: 9,
      working_hours_end: 22,
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await throwOnError({ error: upsertErr }, 'create default schedule');
  }

  // Delete non-default schedules
  const schedulesDeleteResult = await admin
    .from('schedules')
    .delete()
    .eq('user_id', userId)
    .eq('is_default', false);
  await throwOnError(schedulesDeleteResult, 'delete non-default schedules');

  // 6. Google calendar tokens (if any)
  const gcalResult = await admin
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId);
  // Ignore "table does not exist" errors for google_calendar_tokens
  if (
    gcalResult.error &&
    !gcalResult.error.message.includes('does not exist')
  ) {
    await throwOnError(gcalResult, 'google_calendar_tokens');
  }

  console.log('[cleanup] Done.');
}
