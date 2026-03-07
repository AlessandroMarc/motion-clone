/**
 * Playwright global teardown for integration tests.
 *
 * Wipes all data created by the test user during the run,
 * ensuring no dirt data is left in the production database.
 */

import { createClient } from '@supabase/supabase-js';
import { cleanupTestUser } from './helpers/cleanup';

export default async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !testUserEmail) {
    console.warn('[globalTeardown] Missing env vars — skipping cleanup.');
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await admin.auth.admin.listUsers();
  const testUser = data?.users.find(u => u.email === testUserEmail);
  if (!testUser) {
    console.warn('[globalTeardown] Test user not found — skipping cleanup.');
    return;
  }

  await cleanupTestUser(admin, testUser.id);
  console.log('[globalTeardown] Test user data wiped ✓');
}
