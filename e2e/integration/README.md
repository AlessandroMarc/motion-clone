# Integration E2E Tests

These tests run against the **real** backend and Supabase database — no mocking.
They use a dedicated Google test account so production user data is never touched.

## Prerequisites

1. **Dedicated test Google account** — sign in to the app with it at least once so the user exists in Supabase.

2. **Add `E2E_TEST_USER_EMAIL` to your root `.env`**:
   ```
   E2E_TEST_USER_EMAIL=your-test@gmail.com
   ```
   The Supabase keys are already there (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## How it works

1. **`globalSetup`** authenticates the test user via the Supabase admin API (magic link) and saves the browser session to `e2e/integration/.auth/storageState.json`. It then **wipes all data** for the test user so every run starts clean.

2. **Tests** run with the saved session — the browser is already logged in. Tests interact with the real UI, real backend, and real database.

3. **`globalTeardown`** wipes the test user's data again, leaving no trace.

No new auth methods are added. Google remains the only way to register/login. The admin API is only used in test scripts.

## Running

```bash
# From repo root
npm run test:e2e:integration
```

## Adding tests

- Place test files in `e2e/integration/` with the pattern `*.integration.spec.ts`.
- Prefix any data created by tests with `[E2E]` as a safety convention.
- Tests don't need to mock API routes — they hit the real backend.
- The `storageState` is automatically applied, so the browser is pre-authenticated.

## Cleanup safety net

Even if a test crashes mid-run, the **next run's globalSetup wipes everything** for the test user. The globalTeardown is a secondary safety net.
