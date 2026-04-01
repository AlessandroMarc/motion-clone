# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Recurring Task Completion Incorrectly Calls completeTaskWithEvents
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `choice = 'task'` with any recurring task (`is_recurring = true`)
  - In `useCalendarDialogs.test.ts`, mock `taskService.getTaskById` to return a task with `is_recurring = true`
  - Call `handleCompletionChoice('task', setEvents)` and assert `taskService.completeTaskWithEvents` is NOT called
  - Assert `calendarService.updateCalendarEvent` (or equivalent `completeSingleEvent` path) IS called with `completed_at` set
  - Assert the task's `status` and `actual_duration_minutes` are unchanged after the call
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (confirms `completeTaskWithEvents` is being called for recurring tasks — the bug)
  - Document counterexamples found (e.g., "`handleCompletionChoice('task', ...)` with `is_recurring = true` invokes `completeTaskWithEvents`, setting `actual_duration_minutes = planned_duration_minutes`")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Recurring and Session-Only Completion Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `handleCompletionChoice('task', ...)` with `is_recurring = false` calls `completeTaskWithEvents`
  - Observe on UNFIXED code: `handleCompletionChoice('session', ...)` with any task calls `completeSingleEvent`
  - Observe on UNFIXED code: single-session recurring task path (no dialog) calls `completeSingleEvent` directly
  - Write property-based tests generating random `Task` objects with `is_recurring = false` and `choice = 'task'` — assert `completeTaskWithEvents` is always called
  - Write property-based tests generating random `choice = 'session'` inputs with both `is_recurring = true` and `false` — assert `completeSingleEvent` is always called
  - Write test for `CalendarCompletionDialog` with `isRecurring = false` — assert "Complete entire task" button is present
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix recurring task completion routing
  - [x] 3.1 Add `is_recurring` guard in `handleCompletionChoice`
    - In `frontend/src/components/Calendar/hooks/useCalendarDialogs.ts`, move the `getTaskById` call before the `if (choice === 'session')` branch so `is_recurring` is available for both paths
    - In the `'task'` branch, add: `if (task.is_recurring) { await completeSingleEvent(true, setEvents); fireConfetti(); return; }`
    - The `else` branch (non-recurring) remains unchanged — calls `completeTaskWithEvents`
    - _Bug_Condition: `isBugCondition(input)` where `input.choice = 'task'` AND `input.linkedTask.is_recurring = true`_
    - _Expected_Behavior: only the selected calendar event is completed; task `status` and `actual_duration_minutes` are unchanged_
    - _Preservation: non-recurring task `'task'` choice still calls `completeTaskWithEvents`; `'session'` choice for any task still calls `completeSingleEvent`_
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

  - [x] 3.2 Store `isRecurring` in dialog state and pass to `CalendarCompletionDialog`
    - In `handleUpdateCompletion`, when setting `completionChoiceOpen = true`, also derive `is_recurring` from the linked task and store it in state
    - Pass `isRecurring` as a prop to `CalendarCompletionDialog`
    - In `frontend/src/components/Calendar/CalendarCompletionDialog.tsx`, accept `isRecurring?: boolean` prop and hide (or omit) the "Complete entire task" button when `isRecurring = true`
    - _Requirements: 2.1_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Recurring Task Completion Completes Only the Occurrence
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the fix is correct
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 1.1, 1.2, 1.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Recurring and Session-Only Completion Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite for `useCalendarDialogs.ts` and `CalendarCompletionDialog.tsx`
  - Ensure all tests pass; ask the user if questions arise
