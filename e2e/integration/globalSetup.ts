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

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
  const isTestAccount = process.env.E2E_TEST_USER_IS_TEST === 'true';

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !testUserEmail) {
    throw new Error(
      'Integration tests require environment variables in root .env:\n' +
        '  - SUPABASE_URL\n' +
        '  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        '  - SUPABASE_SERVICE_ROLE_KEY\n' +
        '  - E2E_TEST_USER_EMAIL\n' +
        '  - E2E_TEST_USER_IS_TEST=true (safety marker to prevent accidental deletion)\n' +
        'See e2e/integration/README.md for details.'
    );
  }

  if (!isTestAccount) {
    throw new Error(
      'Integration tests require E2E_TEST_USER_IS_TEST=true to prevent accidental deletion of real user data.\n' +
        'Set this environment variable in root .env to explicitly confirm this is a test account.'
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Find the existing test user (registered via Google) ──
  const testUser = await getUserByEmailPaginated(admin, testUserEmail);
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
  console.log(
    '[globalSetup] Navigating to magic link:',
    actionLink.substring(0, 80) + '...'
  );
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

  console.log(
    '[globalSetup] Extracted access token and refresh token from URL hash'
  );

  // Instead of navigating to localhost directly, construct a URL with auth parameters
  // This lets the Supabase client process the auth naturally

  console.log(
    '[globalSetup] Navigating to base URL and setting session in localStorage…'
  );

  // First navigate to the base URL
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  // Now manually set the session in localStorage so Supabase client can read it
  // The Supabase SDK stores the session under a key like: sb-<project-id>-auth-token
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  await page.evaluate(
    ({ supabaseUrl, accessToken, refreshToken, expiresAt }) => {
      // Extract project ID from Supabase URL (https://PROJECT_ID.supabase.co)
      const projectId = supabaseUrl.split('.')[0].split('//')[1];
      const storageKey = `sb-${projectId}-auth-token`;

      // Create session object matching Supabase's expected format
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: expiresAt,
        token_type: 'bearer',
        type: 'magiclink',
      };

      localStorage.setItem(storageKey, JSON.stringify(session));
      console.log('[browser] Session set in localStorage:', storageKey);

      // Also try to set cookies for Supabase
      // Supabase SDK v2 uses sb-* prefixed localStorage keys, not cookies
      // But let's also set these just in case
      const expiresDate = new Date(expiresAt * 1000);
      document.cookie = `sb-${projectId}-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; expires=${expiresDate.toUTCString()}`;
    },
    { supabaseUrl, accessToken, refreshToken, expiresAt }
  );

  // Wait for the AuthContext to initialize and load the session
  await page.waitForTimeout(1000);

  // Reload the page so the Supabase client picks up the session from localStorage
  console.log(
    '[globalSetup] Reloading page to let Supabase client pick up session…'
  );
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for the page to fully render with auth
  await page.waitForTimeout(2000);

  console.log('[globalSetup] Session established, saving storage state…');
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  console.log('[globalSetup] Done ✓');
}
