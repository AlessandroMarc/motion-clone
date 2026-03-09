# Consolidation Plan

Baseline: 245 tests passing (18 suites).
Final: 284 backend+shared tests (22 suites) + 266 frontend tests (19 suites). All passing.

## 1. Extract shared priority constants to `shared/` ✅

- [x] Add `TASK_PRIORITY_RANK`, `compareTaskPriority`, `sortByPriority` to `shared/taskPriority.ts`
- [x] Add tests for shared priority module (`shared/__tests__/taskPriority.test.ts`) — 7 tests
- [x] Update frontend `taskUtils.ts` to re-export from shared
- [x] Update backend `taskScheduler.ts` to import from shared

## 2. Extract shared schedule interpretation to `shared/` ✅

- [x] Add `getScheduleDayHours`, `formatWorkingHoursSummary` to `shared/scheduleUtils.ts`
- [x] Add tests for shared schedule module (`shared/__tests__/scheduleUtils.test.ts`) — 9 tests
- [x] Update frontend `scheduleUtils.ts` to re-export from shared

## 3. Extract shared date utilities to `shared/` ✅

- [x] Add `normalizeToMidnight`, `parseLocalDate`, `toLocalDateString` to `shared/dateUtils.ts`
- [x] Add tests for shared date module (`shared/__tests__/dateUtils.test.ts`) — 12 tests
- [x] Update frontend `dateUtils.ts` to re-export from shared
- [x] Update backend `taskService.ts` and `projectService.ts` to use shared functions

## 4. Extract shared validation constants to `shared/` ✅

- [x] Add validation constants and functions to `shared/validation.ts`
- [x] Add tests for shared validation (`shared/__tests__/validation.test.ts`) — 11 tests
- [x] Update frontend `useTaskForm.ts` to use shared constants in Zod schema

## 5. Standardize type naming (camelCase → snake_case) ✅

- [x] Migrated `Project.createdAt/updatedAt` → `created_at/updated_at` (matches DB columns)
- [x] Migrated `Milestone.dueDate/createdAt/updatedAt` → `due_date/created_at/updated_at`
- [x] Updated all test mocks and fixtures across frontend, backend, and e2e
- [x] Fixed backend tsconfig to exclude shared test files from build
