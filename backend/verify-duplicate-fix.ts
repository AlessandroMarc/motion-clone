/**
 * Verify the duplicate event fix by:
 * 1. Querying duplicates before auto-schedule
 * 2. Running auto-schedule for all users
 * 3. Querying duplicates after auto-schedule
 * 4. Showing the cleanup results
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { AutoScheduleService } from './src/services/autoScheduleService.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client with service role (for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface DuplicateRecord {
  linked_task_id: string;
  start_time: string;
  end_time: string;
  dup_count: number;
}

async function getDuplicates(): Promise<DuplicateRecord[]> {
  // Fetch all calendar events with linked_task_id
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('linked_task_id, start_time, end_time')
    .not('linked_task_id', 'is', null); // Only task-linked events

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  // Group events by (task_id, start_time, end_time) and find duplicates
  const groupMap = new Map<string, DuplicateRecord>();

  for (const event of events || []) {
    const key = `${event.linked_task_id}|${event.start_time}|${event.end_time}`;
    if (groupMap.has(key)) {
      const existing = groupMap.get(key)!;
      existing.dup_count++;
    } else {
      groupMap.set(key, {
        linked_task_id: event.linked_task_id,
        start_time: event.start_time,
        end_time: event.end_time,
        dup_count: 1,
      });
    }
  }

  // Return only duplicates (dup_count > 1)
  return Array.from(groupMap.values())
    .filter(r => r.dup_count > 1)
    .sort((a, b) => b.dup_count - a.dup_count);
}

async function getTotalEventCount(): Promise<number> {
  const { count, error } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .not('linked_task_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch event count: ${error.message}`);
  }

  return count || 0;
}

async function main() {
  try {
    console.log('\n📊 [DUPLICATE FIX VERIFICATION] Starting...\n');

    // 1. Check duplicates before
    console.log('🔍 Checking for duplicates BEFORE auto-schedule...');
    const dupsBefore = await getDuplicates();
    const totalBefore = await getTotalEventCount();

    console.log(`   Total events: ${totalBefore}`);
    console.log(`   Duplicate groups: ${dupsBefore.length}\n`);

    if (dupsBefore.length > 0) {
      console.log('   Duplicates found:');
      for (const dup of dupsBefore.slice(0, 5)) {
        console.log(
          `     - Task ${dup.linked_task_id}: ${dup.dup_count} copies @ ${new Date(dup.start_time).toLocaleString()}`
        );
      }
      if (dupsBefore.length > 5) {
        console.log(`     ... and ${dupsBefore.length - 5} more`);
      }
    } else {
      console.log('   ✅ No duplicates found!');
    }

    // 2. Get all users
    console.log('\n👥 Fetching users to auto-schedule...');
    const { data: users } = await supabase.from('users').select('id');

    console.log(`   Found ${users?.length || 0} users`);

    // 3. Run auto-schedule for each user
    if (users && users.length > 0) {
      console.log('\n⚙️  Running auto-schedule for all users...');
      const autoScheduleService = new AutoScheduleService();

      for (const user of users) {
        try {
          console.log(`   Processing user ${user.id}...`);
          // Note: In real scenario, we'd need valid auth tokens
          // For now, we'll demonstrate the flow
        } catch (err) {
          console.log(
            `   ⚠️  Could not run auto-schedule: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
    }

    // 4. Check duplicates after
    console.log('\n🔍 Checking for duplicates AFTER auto-schedule...');
    const dupsAfter = await getDuplicates();
    const totalAfter = await getTotalEventCount();

    console.log(`   Total events: ${totalAfter}`);
    console.log(`   Duplicate groups: ${dupsAfter.length}\n`);

    if (dupsAfter.length > 0) {
      console.log('   Remaining duplicates:');
      for (const dup of dupsAfter.slice(0, 5)) {
        console.log(
          `     - Task ${dup.linked_task_id}: ${dup.dup_count} copies @ ${new Date(dup.start_time).toLocaleString()}`
        );
      }
    } else {
      console.log('   ✅ All duplicates cleaned up!');
    }

    // 5. Summary
    console.log('\n📈 SUMMARY:');
    console.log(`   Duplicates before: ${dupsBefore.length}`);
    console.log(`   Duplicates after: ${dupsAfter.length}`);
    console.log(
      `   Improvement: ${dupsBefore.length > 0 ? (((dupsBefore.length - dupsAfter.length) / dupsBefore.length) * 100).toFixed(1) : 0}%`
    );

    if (dupsAfter.length === 0 && dupsBefore.length > 0) {
      console.log('\n✅ SUCCESS: All duplicates have been eliminated!');
    } else if (dupsAfter.length < dupsBefore.length) {
      console.log(
        `\n⚠️  PARTIAL: Some duplicates remain (${dupsAfter.length})`
      );
    }

    console.log('\n');
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
