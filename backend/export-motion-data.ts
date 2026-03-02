/**
 * Export Motion data to a JSON file before migration.
 *
 * This script fetches all Motion data and saves it to motion-export.json
 * without writing anything to Nexto. Useful for inspection and debugging.
 *
 * Usage:
 *   MOTION_API_KEY=your_key npx tsx backend/export-motion-data.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { MotionApiService } from './src/services/motionApiService.js';

// Load .env.debug from current directory (backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.debug');
dotenv.config({ path: envPath });

async function exportMotionData() {
  const motionApiKey = process.env.MOTION_API_KEY;

  if (!motionApiKey) {
    console.error('❌ MOTION_API_KEY environment variable is required');
    console.error('   Get it from: https://app.usemotion.com/settings/integrations');
    process.exit(1);
  }

  console.log('🚀 Exporting Motion data...\n');

  try {
    const motionApi = new MotionApiService(motionApiKey);

    // 1. Get user
    console.log('📥 Fetching Motion user...');
    const user = await motionApi.getMe();

    // 2. Get schedules
    console.log('📥 Fetching schedules...');
    const schedules = await motionApi.listSchedules();

    // 3. Get workspaces
    console.log('📥 Fetching workspaces...');
    const workspaces = await motionApi.listWorkspaces();

    // 4. For each workspace, get projects, tasks, and recurring tasks
    const workspaceData = [];
    for (const ws of workspaces) {
      console.log(`📥 Fetching data for workspace: ${ws.name}`);

      try {
        const projects = await motionApi.listProjects(ws.id);
        const tasks = await motionApi.listTasks(ws.id);
        const recurringTasks = await motionApi.listRecurringTasks(ws.id);

        workspaceData.push({
          workspace: ws,
          projects,
          tasks,
          recurringTasks,
        });

        console.log(`   ✓ Projects: ${projects.length}`);
        console.log(`   ✓ Tasks: ${tasks.length}`);
        console.log(`   ✓ Recurring Tasks: ${recurringTasks.length}`);
      } catch (err) {
        console.error(`   ✗ Error fetching workspace data: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 5. Assemble export
    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      schedules,
      workspaces: workspaceData,
      summary: {
        totalWorkspaces: workspaces.length,
        totalProjects: workspaceData.reduce((sum, w) => sum + w.projects.length, 0),
        totalTasks: workspaceData.reduce((sum, w) => sum + w.tasks.length, 0),
        totalRecurringTasks: workspaceData.reduce((sum, w) => sum + w.recurringTasks.length, 0),
      },
    };

    // 6. Write to file
    const outputPath = path.join(__dirname, 'motion-export.json');
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log('\n✅ Export completed!\n');
    console.log(`📄 File saved to: ${outputPath}\n`);
    console.log('📊 Summary:');
    console.log(`   Motion User: ${user.email}`);
    console.log(`   Workspaces: ${exportData.summary.totalWorkspaces}`);
    console.log(`   Projects: ${exportData.summary.totalProjects}`);
    console.log(`   Tasks: ${exportData.summary.totalTasks}`);
    console.log(`   Recurring Tasks: ${exportData.summary.totalRecurringTasks}\n`);
    console.log('Next step: Review motion-export.json, then run debug-migration.ts to import');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

exportMotionData();
