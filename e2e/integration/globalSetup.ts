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
import { fileURLToPath } from 'url';
import { cleanupTestUser } from './helpers/cleanup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path where the authenticated browser state is stored between runs. */
export const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  '.auth/storageState.json'
);

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !testUserEmail) {
    throw new Error(
      'Integration tests require SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and E2E_TEST_USER_EMAIL env vars.\n' +
        'See e2e/integration/README.md for details.'
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
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: testUserEmail,
      options: {
        redirectTo: baseURL,
      },
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
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Visit the magic link — Supabase will verify and redirect (possibly to a different domain)
  console.log('[globalSetup] Navigating to magic link:', actionLink.substring(0, 80) + '...');
  await page.goto(actionLink, { waitUntil: 'domcontentloaded' });

  const finalUrl = page.url();
  console.log('[globalSetup] Final URL after redirect:', finalUrl);

  // The magic link redirect may go to a different domain (e.g., https://nexto.run if that's
  // configured as the auth redirect URL). Extract the session token from the URL hash.
  const hashParams = new URLSearchParams(finalUrl.split('#')[1] || '');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    throw new Error(
      `Failed to extract session from magic link redirect. URL: ${finalUrl}`
    );
  }

  console.log('[globalSetup] Extracted access token and refresh token from URL hash');

  // Instead of navigating to localhost directly, construct a URL with auth parameters
  // This lets the Supabase client process the auth naturally

  console.log('[globalSetup] Navigating to base URL with auth in hash…');

  // Navigate to base URL with the access token and refresh token in the URL hash
  // so the Supabase client can process it naturally
  const authUrl = `${baseURL}/#access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=magiclink`;

  await page.goto(authUrl, { waitUntil: 'networkidle' });

  // Wait for Supabase to process the auth parameters and update the session
  // The app should automatically detect the session from the URL hash
  await page.waitForTimeout(2000);

  // Check if the Supabase client recognized the session
  const sessionExists = await page.evaluate(async () => {
    // Import and check the session in the browser context
    const keys = Object.keys(localStorage);
    const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return !!authKey && !!localStorage.getItem(authKey);
  });

  if (!sessionExists) {
    console.warn('[globalSetup] Warning: Session not found in localStorage after auth URL navigation');
  } else {
    console.log('[globalSetup] Session successfully loaded from auth URL');
  }

  // Wait a bit more for the AuthContext to propagate the session to React state
  await page.waitForTimeout(1000);

  console.log('[globalSetup] Session established, saving storage state…');
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  console.log('[globalSetup] Done ✓');
}
