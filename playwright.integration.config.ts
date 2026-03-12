import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Playwright config for INTEGRATION tests.
 *
 * Unlike the default E2E config, this:
 *  - Does NOT set NEXT_PUBLIC_AUTH_BYPASS (real auth via Supabase session)
 *  - Points at the REAL Supabase instance (env vars from root .env)
 *  - Starts BOTH frontend and backend servers
 *  - Runs globalSetup/globalTeardown to authenticate and clean up
 *  - Uses saved storageState so every test is already logged in
 */

// Load env vars from root .env
// (already has SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_USER_EMAIL)
dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './e2e/integration',
  testMatch: '**/*.integration.spec.ts',
  timeout: 90_000, // 90s for integration tests (real backend is slower)
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [['list'], ['json', { outputFile: 'playwright-report/results.json' }]],

  globalSetup: './e2e/integration/globalSetup.ts',
  globalTeardown: './e2e/integration/globalTeardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Reuse the authenticated session from globalSetup
    storageState: './e2e/integration/.auth/storageState.json',
  },

  projects: [
    {
      name: 'integration-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Backend — real Express server on port 3003
      command: 'npm run dev-b',
      url: 'http://localhost:3003/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000, // Increased timeout for CI environments
    },
    {
      // Frontend — real Next.js with real Supabase credentials (NO auth bypass)
      command: 'npm --prefix frontend run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL:
          process.env.NEXT_PUBLIC_SUPABASE_URL ??
          process.env.SUPABASE_URL ??
          '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          '',
        NEXT_PUBLIC_API_URL: 'http://localhost:3003/api',
        NODE_ENV: 'development',
        // Explicitly NOT setting NEXT_PUBLIC_AUTH_BYPASS
      },
    },
  ],
});
