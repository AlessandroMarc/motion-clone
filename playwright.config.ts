import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 *
 * Tests run against the Next.js dev server with:
 *  - NEXT_PUBLIC_AUTH_BYPASS=1  — skips Supabase auth checks
 *  - Placeholder Supabase env vars — so the client initialises without errors
 *
 * API calls to /api/* are intercepted per-test via page.route() so no live
 * backend is required.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: [
      'NEXT_PUBLIC_AUTH_BYPASS=1',
      'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key',
      'npm --prefix frontend run dev',
    ].join(' '),
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_AUTH_BYPASS: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
    },
  },
});
