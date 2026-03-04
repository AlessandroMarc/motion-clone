/**
 * Export Motion data to a JSON file before migration.
 *
 * This script fetches all Motion data and saves it to motion-export.json
 * without writing anything to Nexto. Useful for inspection and debugging.
 *
 * The saveMotionSnapshot() function can also be imported and called
 * programmatically (for example, from a migration service) before importing
 * data into Nexto.
 *
 * Standalone usage (export only, no import):
 *   cd backend && npx tsx export-motion-data.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { MotionApiService } from './src/services/motionApiService.js';
import type {
  MotionUser,
  MotionWorkspace,
  MotionProject,
  MotionTask,
  MotionRecurringTask,
  MotionSchedule,
} from './src/types/motion.js';

// Load .env.debug from current directory (backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.debug') });

export interface MotionWorkspaceSnapshot {
  workspace: MotionWorkspace;
  projects: MotionProject[];
  tasks: MotionTask[];
  recurringTasks: MotionRecurringTask[];
}

export interface MotionSnapshot {
  exportedAt: string;
  user: MotionUser;
  schedules: MotionSchedule[];
  workspaces: MotionWorkspaceSnapshot[];
}

/**
 * Fetches all Motion data for a given API key and saves it to motion-export.json.
 * Returns the snapshot so the caller can use it without re-parsing the file.
 */
export async function saveMotionSnapshot(motionApiKey: string, outputDir: string): Promise<MotionSnapshot> {
  const motionApi = new MotionApiService(motionApiKey);

  console.log('📥 Fetching Motion user...');
  const user = await motionApi.getMe();

  console.log('📥 Fetching schedules...');
  const schedules = await motionApi.listSchedules();

  console.log('📥 Fetching workspaces...');
  const workspaces = await motionApi.listWorkspaces();

  const workspaceSnapshots: MotionWorkspaceSnapshot[] = [];
  for (const ws of workspaces) {
    console.log(`📥 Fetching data for workspace: ${ws.name}`);
    let projects: MotionProject[] = [];
    let tasks: MotionTask[] = [];
    let recurringTasks: MotionRecurringTask[] = [];
    try { projects = await motionApi.listProjects(ws.id); } catch (err) { console.error(`   ✗ projects: ${err instanceof Error ? err.message : String(err)}`); }
    try { tasks = await motionApi.listTasks(ws.id); } catch (err) { console.error(`   ✗ tasks: ${err instanceof Error ? err.message : String(err)}`); }
    try { recurringTasks = await motionApi.listRecurringTasks(ws.id); } catch (err) { console.error(`   ✗ recurring: ${err instanceof Error ? err.message : String(err)}`); }

    // Filter: only active projects (not resolved/completed) and incomplete tasks
    const activeProjects = projects.filter(p => p.status?.isResolvedStatus === false);
    const activeTasks = tasks.filter(t =>  t.status.isResolvedStatus === false);

    workspaceSnapshots.push({ workspace: ws, projects: activeProjects, tasks: activeTasks, recurringTasks });
    console.log(`   ✓ Projects: ${activeProjects.length}/${projects.length} active, Tasks: ${activeTasks.length}/${tasks.length} active, Recurring: ${recurringTasks.length}`);
  }

  const snapshot: MotionSnapshot = {
    exportedAt: new Date().toISOString(),
    user,
    schedules,
    workspaces: workspaceSnapshots,
  };

  const outputPath = path.join(outputDir, 'motion-export.json');
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`📄 Snapshot saved to: ${outputPath}`);

  return snapshot;
}

// ── Standalone script entry point ────────────────────────────────────────────
async function main() {
  const motionApiKey = process.env.MOTION_API_KEY;
  if (!motionApiKey) {
    console.error('❌ MOTION_API_KEY environment variable is required');
    console.error('   Get it from: https://app.usemotion.com/settings/integrations');
    process.exit(1);
  }

  console.log('🚀 Exporting Motion data...\n');
  try {
    const snapshot = await saveMotionSnapshot(motionApiKey, __dirname);
    console.log('\n✅ Export completed!');
    console.log(`   User: ${snapshot.user.email}`);
    console.log(`   Workspaces: ${snapshot.workspaces.length}`);
    console.log(`   Projects: ${snapshot.workspaces.reduce((s, w) => s + w.projects.length, 0)}`);
    console.log(`   Tasks: ${snapshot.workspaces.reduce((s, w) => s + w.tasks.length, 0)}`);
    console.log(`   Recurring Tasks: ${snapshot.workspaces.reduce((s, w) => s + w.recurringTasks.length, 0)}\n`);
    console.log('Review motion-export.json, then run debug-migration.ts to import into Nexto.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Only run when executed directly (not when imported as a module)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
