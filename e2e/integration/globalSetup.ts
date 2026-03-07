/**
 * Playwright global setup for integration tests.
 *
 * Uses the Supabase service-role admin API to generate a valid session
 * for the dedicated test Google account — no new auth providers needed.
 *
 * The session is persisted as a Playwright storageState JSON file so every
 * test reuses it without re-authenticating.
 *
 * Before the suite starts we also wipe ALL data belonging to the test user
 * so tests always begin from a clean slate.
 */

import { createClient } from '@supabase/supabase-js';
import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { cleanupTestUser } from './helpers/cleanup';

/** Path where the authenticated browser state is stored between runs. */
export const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  '.auth/storageState.json'
);

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !testUserEmail) {
    throw new Error(
      'Integration tests require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and E2E_TEST_USER_EMAIL env vars.\n' +
        'Create an e2e/.env file — see e2e/integration/README.md for details.'
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Find the existing test user (registered via Google) ──
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers();
  if (listError) throw new Error(`Failed to list users: ${listError.message}`);

  const testUser = listData.users.find(u => u.email === testUserEmail);
  if (!testUser) {
    throw new Error(
      `Test user "${testUserEmail}" not found in Supabase.\n` +
        'Sign in with that Google account at least once so the user exists.'
    );
  }

  console.log(`[globalSetup] Found test user: ${testUser.id}`);

  // ── 2. Wipe all data for the test user (clean slate) ──
  await cleanupTestUser(admin, testUser.id);
  console.log('[globalSetup] Test user data wiped.');

  // ── 3. Generate a fresh session via the admin API ──
  // generateLink with type "magiclink" returns a valid action_link.
  // We open it in a real browser to let Supabase set session cookies and
  // populate localStorage, which we then save as storageState.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: testUserEmail,
    });
  if (linkError || !linkData?.properties?.action_link) {
    throw new Error(
      `Failed to generate magic link: ${linkError?.message ?? 'no action_link returned'}`
    );
  }

  const actionLink = linkData.properties.action_link;
  console.log('[globalSetup] Magic link generated, opening in browser…');

  // Ensure the .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Open the magic link in a real Chromium browser so Supabase sets the
  // session in cookies / localStorage. Then save the browser state.
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Visit the magic link — Supabase will authenticate and redirect
  await page.goto(actionLink, { waitUntil: 'networkidle' });

  // Wait for the Supabase session to be set in localStorage
  await page.waitForFunction(
    _url => {
      const key = Object.keys(localStorage).find(
        k => k.startsWith(`sb-`) && k.endsWith('-auth-token')
      );
      return !!key && !!localStorage.getItem(key);
    },
    baseURL,
    { timeout: 15_000 }
  );

  console.log('[globalSetup] Session established, saving storage state…');
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  console.log('[globalSetup] Done ✓');
}
