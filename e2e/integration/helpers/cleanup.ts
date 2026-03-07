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

export async function cleanupTestUser(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  console.log(`[cleanup] Wiping data for user ${userId}…`);

  // 1. Calendar events (references tasks via linked_task_id)
  const { error: eventsErr } = await admin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId);
  if (eventsErr) console.warn('[cleanup] calendar_events:', eventsErr.message);

  // 2. Milestones (references projects)
  const { error: milestonesErr } = await admin
    .from('milestones')
    .delete()
    .eq('user_id', userId);
  if (milestonesErr)
    console.warn('[cleanup] milestones:', milestonesErr.message);

  // 3. Tasks (references projects and schedules)
  const { error: tasksErr } = await admin
    .from('tasks')
    .delete()
    .eq('user_id', userId);
  if (tasksErr) console.warn('[cleanup] tasks:', tasksErr.message);

  // 4. Projects
  const { error: projectsErr } = await admin
    .from('projects')
    .delete()
    .eq('user_id', userId);
  if (projectsErr) console.warn('[cleanup] projects:', projectsErr.message);

  // 5. Schedules — delete non-default schedules only.
  //    The default schedule is needed for the app to function.
  const { error: schedulesErr } = await admin
    .from('schedules')
    .delete()
    .eq('user_id', userId)
    .eq('is_default', false);
  if (schedulesErr) console.warn('[cleanup] schedules:', schedulesErr.message);

  // 6. Google calendar tokens (if any)
  const { error: gcalErr } = await admin
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId);
  if (gcalErr && !gcalErr.message.includes('does not exist')) {
    console.warn('[cleanup] google_calendar_tokens:', gcalErr.message);
  }

  console.log('[cleanup] Done.');
}
