# Comprehensive Test Suite Plan (Unit → Integration → E2E)

## TL;DR

Set up Jest unit/integration tests across backend services + routes and frontend components (raising coverage from 60% to 80%), then add Playwright e2e tests for critical user flows (auth, calendar scheduling, task/project CRUD). Mock all external deps (Supabase, Google Calendar). Extend CI to run all test layers. Start with calendar and auth flows (core), then expand to all features equally.

## Status Summary

**Current: 372 tests passing** (188 frontend + 184 backend)

- ✅ **Step 1: Backend Unit Tests** — DONE
- ✅ **Step 2: Backend Integration Tests** — DONE (routes + auth middleware)
- ✅ **Step 3: Frontend Unit Tests** — DONE (components + hooks + utilities)
- ⏳ **Step 4: Frontend Integration Tests** — PENDING (page-level flows)
- ⏳ **Step 5: E2E Tests (Playwright)** — PENDING
- ⏳ **Step 6: Test Data & Mocking** — PARTIAL (fixtures needed for E2E)
- ⏳ **Step 7: CI Pipeline Updates** — IN PROGRESS (`test:ci` script missing)
- ⏳ **Step 8: Coverage Thresholds** — PENDING (80% target not yet enforced)
- ⏳ **Step 9: Documentation** — PENDING

## Steps

### 1. Backend Unit Tests – Services & Utilities

✅ **DONE**

- Expanded `backend/src/services` coverage: `taskService.ts` (21 tests), `projectService.ts` (21 tests), `milestoneService.ts` (18 tests), `userSettingsService.ts` (21 tests)
- Mocked Supabase client via `jest.unstable_mockModule()` (ESM support)
- Tested filtering, validation, edge cases (empty results, invalid inputs, permission checks)
- Coverage: 184 backend tests passing

### 2. Backend Integration Tests – Routes + Auth

✅ **DONE**

- Used `supertest` to test each route file: `tasks.ts` (15 tests), `projects.ts` (13 tests), `milestones.ts` (12 tests), `userSettings.ts` (15 tests), `googleCalendar.ts` (14 tests)
- Tested auth middleware `auth.ts` with valid/invalid tokens, mocked Supabase (13 tests)
- Tested request/response contracts (status codes, error messages, field presence)
- ⚠️ **Auth Gap Flagged**: Milestones routes lack middleware; Google Calendar routes accept `user_id` without auth protection — needs fixing

### 3. Frontend Unit Tests – Components & Hooks

✅ **DONE**

- Component tests: `CalendarEventCard.tsx`, `KanbanTaskCard.tsx`, `ProjectList.tsx` (19 tests)
- Hook tests: `useProjectForm`, `useTaskForm` (63 tests combined)
- Utility tests: `formUtils`, `projectSchedulingStatus`, `calendarUtils`, `dateUtils`, `taskUtils`, `taskScheduler` (106 tests)
- Mocked API services with Jest mocks; isolated component logic
- Tested render states (loading, empty, data-filled, error)
- Coverage: 188 frontend tests passing

### 4. Frontend Integration Tests – Pages & Feature Flows

⏳ **PENDING**

- Test full page flows (auth + protected route + data load): `calendar/page.tsx`, `tasks/page.tsx`, `projects/page.tsx`
- Mock Next.js router and API service calls
- Test interaction chains (e.g., create task → see in calendar → drag to schedule)
- Test auth gate `ProtectedRoute.tsx` with and without login

### 5. End-to-End Tests (Playwright) – Critical User Flows

⏳ **PENDING**

- Install Playwright: `npm install @playwright/test --save-dev` (root `package.json`)
- Create `playwright.config.ts` with baseURL pointing to local frontend
- Priority flows:
  - **Auth**: Sign up → login → verify protected access → logout
  - **Calendar core**: Navigate week → view events → drag task to schedule → verify saved
  - **Task management**: Create task → assign to project → schedule → mark complete
  - **Google Calendar**: Initiate OAuth flow (stub OAuth provider) → verify sync toggle UI
- Mock API endpoints via Playwright's route interception or test backend stubs

### 6. Test Data & Mocking Strategy

⏳ **PARTIAL**

- ✅ Backend services use mocked Supabase via `jest.unstable_mockModule()` with chainable mock client
- ✅ Route integration tests mock `verifyAuthToken` to avoid real JWT verification
- ❌ Need `backend/src/__tests__/fixtures` folder with sample tasks, projects, calendar events, users for E2E
- ❌ Need MSW (Mock Service Worker) setup or Playwright route mocking for frontend E2E
- ❌ Need Google Calendar OAuth stub endpoint for E2E testing

### 7. Update CI Pipeline (`package.json` root scripts)

⏳ **IN PROGRESS**

- ✅ `test:backend` script added: `npm --prefix backend run test`
- ✅ `test:frontend` script added: `npm --prefix frontend run test`
- ❌ `test:ci` script missing — should run: `build` → `test:backend` → `test:frontend` → (optionally `test:e2e`) → `lint` → `format:check`
- ❌ `test:coverage` script exists but not fully integrated
- ❌ Update root `ci` script to include all test layers
- ❌ Document in root README when tests are run vs. skipped (e.g., e2e on main branch only)

### 8. Update Coverage Thresholds

⏳ **PENDING**

- Backend `backend/jest.config.js`: currently at 60%, needs raise to 80% (branches, functions, lines, statements)
- Frontend `frontend/jest.config.js`: currently at 0%, needs 80% threshold + coverage collection config
- Exclude auto-generated files (e.g., migrations, `.d.ts`) and test helpers
- Add coverage reporting to CI logs

### 9. Documentation

⏳ **PENDING**

Add to `backend/ARCHITECTURE.md` and root README:

- How to run tests locally: `npm test`, `npm run test:backend`, `npm run test:e2e`
- How to debug failing tests: env vars for logging, Playwright UI mode
- Test folder structure and naming conventions
- Mock strategy & how to add new mocks

## Verification

### Current Status (Feb 27, 2026)

- ✅ Run `npm run test:backend` → 184 backend tests pass (13 routes + 5 services + 1 middleware)
- ✅ Run `npm run test:frontend` → 188 frontend tests pass (3 components + 2 hooks + 6 utilities)
- ✅ Run `npm test` → all 372 tests pass
- ❌ Run `npm run test:e2e` → NOT YET AVAILABLE (Playwright not installed)
- ❌ Run `npm run test:ci` → SCRIPT MISSING from package.json
- ❌ Coverage thresholds → enforced at 60%, need raise to 80%

### To Complete

- Fix remaining issues: `npm run ci` should pass all checks
- Implement E2E tests with Playwright
- Implement page-level integration tests
- Raise coverage thresholds to 80%
- Add test documentation
- Fix auth gaps in milestones routes

## Decisions

- **Frameworks**: Jest (unit/integration) + Playwright (e2e) — Jest already configured and working; Playwright installation & config pending
- **Coverage target**: Raised to 80% (from 60%) for sustainability — currently at 60%, enforcement pending
- **Mocking strategy**: All external dependencies mocked (Supabase, Google Calendar, etc.) to keep tests fast and deterministic — successfully implemented for backend
- **Auth testing**: Mock Supabase directly in backend tests ✅; stub OAuth endpoints in Playwright tests ⏳
- **Test priorities**: Calendar (core feature) and auth (gating) first; other features covered equally. All 7 backend routes ✅ + frontend utilities ✅ + hooks ✅; pages pending ⏳
- **CI integration**: Backend tests added to root CI script ✅; frontend tests added ✅; E2E optional for now (can be added once foundational tests are solid) ⏳
- **Backend test approach**: Used ESM-compatible `jest.unstable_mockModule()` for mocking Supabase in service/route tests ✅
