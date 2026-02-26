# Comprehensive Test Suite Plan (Unit → Integration → E2E)

## TL;DR

Set up Jest unit/integration tests across backend services + routes and frontend components (raising coverage from 60% to 80%), then add Playwright e2e tests for critical user flows (auth, calendar scheduling, task/project CRUD). Mock all external deps (Supabase, Google Calendar). Extend CI to run all test layers. Start with calendar and auth flows (core), then expand to all features equally.

## Steps

### 1. Backend Unit Tests – Services & Utilities

- Expand `backend/src/services` coverage: `taskService.ts`, `projectService.ts`, `calendarEventService.ts`, `userSettingsService.ts`, `googleCalendarService.ts`
- Mock Supabase client via dependency injection or `jest.mock()`
- Test filtering, validation, edge cases (empty results, invalid inputs, permission checks)
- Raise coverage threshold in `backend/jest.config.js` from 60% to 80%

### 2. Backend Integration Tests – Routes + Auth

- Use `supertest` to test each route file: `tasks.ts`, `projects.ts`, `calendarEvents.ts`, `userSettings.ts`, `googleCalendar.ts`
- Test auth middleware `auth.ts` with valid/invalid tokens, mocked Supabase
- Test request/response contracts (status codes, error messages, field presence)
- Flag & fix auth gaps: milestones routes lack middleware `milestones.ts`; Google Calendar routes accept `user_id` without auth protection

### 3. Frontend Unit Tests – Components & Hooks

- Component tests: `CalendarEventCard.tsx`, `WeekCalendarView.tsx`, `KanbanTaskCard.tsx`, `ProjectList.tsx`
- Mock API services with Jest mocks; isolate component logic
- Test render states (loading, empty, data-filled, error)
- Hook tests: calendar hooks (navigation, drag/drop state)

### 4. Frontend Integration Tests – Pages & Feature Flows

- Test full page flows (auth + protected route + data load): `calendar/page.tsx`, `tasks/page.tsx`, `projects/page.tsx`
- Mock Next.js router and API service calls
- Test interaction chains (e.g., create task → see in calendar → drag to schedule)
- Test auth gate `ProtectedRoute.tsx` with and without login

### 5. End-to-End Tests (Playwright) – Critical User Flows

- Install Playwright: `npm install @playwright/test --save-dev` (root `package.json`)
- Create `playwright.config.ts` with baseURL pointing to local frontend
- Priority flows:
  - **Auth**: Sign up → login → verify protected access → logout
  - **Calendar core**: Navigate week → view events → drag task to schedule → verify saved
  - **Task management**: Create task → assign to project → schedule → mark complete
  - **Google Calendar**: Initiate OAuth flow (stub OAuth provider) → verify sync toggle UI
- Mock API endpoints via Playwright's route interception or test backend stubs

### 6. Test Data & Mocking Strategy

- Create `backend/src/__tests__/fixtures` (sample tasks, projects, calendar events, users)
- Mock Supabase in `backend/jest.config.js` setup: mock auth, read/write queries
- Mock frontend API calls via `jest.mock('@/services/...')` or MSW (Mock Service Worker)
- Mock Google Calendar OAuth: stub `initiate` endpoint to return fake auth URL, `callback` to return fake tokens

### 7. Update CI Pipeline (`package.json` root scripts)

- Add `test:backend` script: `npm --prefix backend run test`
- Add `test:coverage` script: combines frontend + backend coverage reports
- Add `test:e2e` script: `playwright test` (run conditionally in CI or local)
- Update root `ci` script to run: `build` → `test:backend` → `test:ci` (frontend) → `test:e2e` (optional) → `lint` → `format:check`
- Document in root README when tests are run vs. skipped (e.g., e2e on main branch only)

### 8. Update Coverage Thresholds

- Backend `backend/jest.config.js`: raise to 80% (branches, functions, lines, statements)
- Frontend `frontend/jest.config.js`: add similar 80% threshold + coverage collection config
- Exclude auto-generated files (e.g., migrations, `.d.ts`) and test helpers

### 9. Documentation

Add to `backend/ARCHITECTURE.md` and root README:
- How to run tests locally: `npm test`, `npm run test:backend`, `npm run test:e2e`
- How to debug failing tests: env vars for logging, Playwright UI mode
- Test folder structure and naming conventions
- Mock strategy & how to add new mocks

## Verification

- Run `npm run test:backend` → all backend tests pass, 80%+ coverage
- Run `npm run test` → all frontend tests pass, 80%+ coverage  
- Run `npm run test:e2e` → critical paths (auth, calendar, tasks) pass
- Run `npm run ci` → all linting, formatting, tests, and builds pass
- Check coverage reports in CI logs or locally in `coverage/` folders

## Decisions

- **Frameworks**: Jest (unit/integration) + Playwright (e2e) — Jest already configured, Playwright handles real browser flows
- **Coverage target**: Raised to 80% (from 60%) for sustainability
- **Mocking strategy**: All external dependencies mocked (Supabase, Google Calendar, etc.) to keep tests fast and deterministic
- **Auth testing**: Mock Supabase directly in backend tests; stub OAuth endpoints in Playwright tests
- **Test priorities**: Calendar (core feature) and auth (gating) first; other features covered equally. All 7 backend routes + all main frontend pages included
- **CI integration**: Backend tests added to root CI script; e2e optional for now (can be added once foundational tests are solid)
