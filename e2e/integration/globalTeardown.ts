/**
 * Playwright global teardown for integration tests.
 *
 * Wipes all data created by the test user during the run,
 * ensuring no dirt data is left in the production database.
 */

import { createClient } from '@supabase/supabase-js';
import { cleanupTestUser } from './helpers/cleanup';

/** Helper to find user by email, paginating through all results. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserByEmailPaginated(admin: any, email: string) {
  let page = 1;
  const perPage = 50;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list users on page ${page}: ${error.message}`);
    }

    const user = data.users.find((u: { email: string }) => u.email === email);
    if (user) {
      return user;
    }

    // Stop if we've reached the last page
    if (data.users.length < perPage) {
      return null;
    }

    page++;
  }
}

export default async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
  const isTestAccount = process.env.E2E_TEST_USER_IS_TEST === 'true';

  if (!supabaseUrl || !serviceRoleKey || !testUserEmail) {
    console.warn('[globalTeardown] Missing env vars — skipping cleanup.');
    return;
  }

  if (!isTestAccount) {
    throw new Error(
      'globalTeardown: E2E_TEST_USER_IS_TEST must be true to prevent accidental deletion.'
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testUser = await getUserByEmailPaginated(admin, testUserEmail);
  if (!testUser) {
    console.warn('[globalTeardown] Test user not found — skipping cleanup.');
    return;
  }

  await cleanupTestUser(admin, testUser.id);
  console.log('[globalTeardown] Test user data wiped ✓');
}
