import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Playwright config for LOCAL integration testing with Test Runner extension.
 *
 * This config is optimized for VS Code Test Runner:
 * - Uses pre-existing storageState (no globalSetup delay)
 * - Faster startup for iterative development
 * - Same tests as playwright.integration.config.ts
 *
 * IMPORTANT: Run globalSetup once manually before using this config:
 *   npx playwright test --config playwright.integration.config.ts --list
 *
 * Then use this config for Test Runner:
 *   npx playwright test --config playwright.local.config.ts
 */

// Load env vars from root .env
dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './e2e/integration',
  testMatch: '**/*.integration.spec.ts',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for local dev
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'playwright-report/results.json' }]],

  // No globalSetup - assumes storageState already exists from manual setup
  globalSetup: undefined,
  globalTeardown: undefined,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use existing storageState from previous globalSetup run
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
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // Frontend — real Next.js with real Supabase credentials
      command: 'npm --prefix frontend run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
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
      },
    },
  ],
});
