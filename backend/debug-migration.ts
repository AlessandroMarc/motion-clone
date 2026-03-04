/**
 * Debug script for Motion Migration.
 *
 * This script calls the Motion migration endpoint directly.
 * It requires ONLY two environment variables:
 *   - MOTION_API_KEY: Your Motion API token
 *   - NEXTO_JWT: Your Supabase JWT token (user ID is extracted from the token)
 *
 * Usage:
 *   npx tsx backend/debug-migration.ts
 *   (will load .env.debug from backend directory)
 *
 * Or with explicit env:
 *   MOTION_API_KEY=your_key NEXTO_JWT=your_token npx tsx backend/debug-migration.ts
 *
 * Or with breakpoints in VS Code:
 *   1. Set env vars in .vscode/launch.json (Debug: Motion Migration Script config)
 *   2. Press F5 to start debugging
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MotionMigrationService } from './src/services/motionMigrationService.js';
import { verifyAuthToken } from './src/config/supabase.js';

// Load .env.debug from current directory (backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.debug');
dotenv.config({ path: envPath });

async function debugMigration() {
  const motionApiKey = process.env.MOTION_API_KEY;
  const nextoAuthToken = process.env.NEXTO_JWT;

  // Validation
  if (!motionApiKey) {
    console.error('❌ MOTION_API_KEY environment variable is required');
    console.error('   Get it from: https://app.usemotion.com/settings/integrations');
    process.exit(1);
  }

  if (!nextoAuthToken) {
    console.error('❌ NEXTO_JWT environment variable is required');
    console.error('   Get it from browser DevTools or Supabase auth session');
    process.exit(1);
  }

  let nextoUserId: string;
  try {
    const decoded = verifyAuthToken(nextoAuthToken);
    nextoUserId = decoded.userId;
  } catch (e) {
    console.error('❌ Failed to decode NEXTO_JWT:', e instanceof Error ? e.message : String(e));
    console.error('   Ensure NEXTO_JWT is a valid Supabase JWT token');
    process.exit(1);
  }

  console.log('🚀 Starting Motion → Nexto migration...\n');
  console.log('📋 Configuration:');
  console.log(`   Motion API Key: ${motionApiKey.substring(0, 10)}...`);
  console.log(`   Nexto User ID: ${nextoUserId} (from JWT)`);
  console.log(`   Nexto JWT: ${nextoAuthToken.substring(0, 20)}...\n`);

  try {
    const service = new MotionMigrationService(motionApiKey);

    console.log('⏳ Fetching Motion workspace and data...');
    const result = await service.migrate(nextoUserId, nextoAuthToken);

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Motion User: ${result.userId}`);
    console.log(`   Schedules Found: ${result.schedulesFound}`);
    console.log(`   Workspaces Processed: ${result.workspaces.length}`);
    console.log(`   Total Projects Imported: ${result.totalProjectsImported}`);
    console.log(`   Total Tasks Imported: ${result.totalTasksImported}`);
    console.log(`   Total Recurring Tasks Imported: ${result.totalRecurringTasksImported}\n`);

    // Show per-workspace details
    for (const ws of result.workspaces) {
      console.log(`📁 Workspace: ${ws.motionWorkspaceName}`);
      console.log(`   Projects: ${ws.projectsImported}`);
      console.log(`   Tasks: ${ws.tasksImported}`);
      console.log(`   Recurring: ${ws.recurringTasksImported}`);

      if (ws.errors.length > 0) {
        console.log(`   ⚠️  Errors (${ws.errors.length}):`);
        ws.errors.forEach(err => console.log(`      - ${err}`));
      }
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n🔍 Debugging tips:');
    console.error('   1. Verify Motion API key is valid');
    console.error('   2. Check NEXTO_JWT is a valid Supabase token');
    console.error('   3. Set breakpoints in motionMigrationService.ts');
    console.error('   4. Check Motion API rate limits (12 req/min)');
    process.exit(1);
  }
}

debugMigration();
