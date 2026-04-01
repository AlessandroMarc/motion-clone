# Recurring Task Completion Bugfix Design

## Overview

When a user completes a calendar session linked to a recurring task and chooses "Complete entire task" in the completion dialog, the system incorrectly calls `completeTaskWithEvents` — a path designed for non-recurring tasks — which sets `actual_duration_minutes = planned_duration_minutes` and marks the task `status = "completed"`. This permanently kills the recurring task, stopping all future occurrence generation.

The fix is targeted: in `handleCompletionChoice` inside `useCalendarDialogs.ts`, when the linked task has `is_recurring = true`, the `'task'` choice must be treated identically to the `'session'` choice — completing only the selected calendar event without touching the task record.

Additionally, the `CalendarCompletionDialog` should not present the "Complete entire task" option for recurring tasks, since it is semantically meaningless in that context.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a completion choice of `'task'` is made for a calendar event whose linked task has `is_recurring = true`
- **Property (P)**: The desired behavior — only the selected calendar event is marked completed; the recurring task's `status` and `actual_duration_minutes` remain unchanged
- **Preservation**: Existing behavior for non-recurring task completion and session-only completion that must remain unchanged by the fix
- **`handleCompletionChoice`**: The function in `frontend/src/components/Calendar/hooks/useCalendarDialogs.ts` that handles the user's choice from the completion dialog
- **`completeTaskWithEvents`**: The function in `frontend/src/services/taskService.ts` that marks a task as completed and completes all its linked calendar events — designed for non-recurring tasks only
- **`completeSingleEvent`**: The function in `useCalendarDialogs.ts` that marks only the selected calendar event as completed without touching the task
- **`is_recurring`**: Boolean field on the `Task` type that indicates whether the task generates recurring occurrences
- **`setTaskCompleted`**: The function in `taskService.ts` that sets `actual_duration_minutes = planned_duration_minutes` and triggers a status update to `"completed"`

## Bug Details

### Bug Condition

The bug manifests when a user selects "Complete entire task" in the completion dialog for a calendar session whose linked task is a recurring task. The `handleCompletionChoice` function routes the `'task'` choice directly to `completeTaskWithEvents` without checking `is_recurring`, causing the recurring task to be permanently marked as completed.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { choice: 'session' | 'task', linkedTask: Task }
  OUTPUT: boolean

  RETURN input.choice = 'task'
         AND input.linkedTask.is_recurring = true
END FUNCTION
```

### Examples

- User has a "Daily standup" recurring task with 5 future sessions. They open the session for Monday, check the completion checkbox, and choose "Complete entire task". Expected: only Monday's event is marked completed, future sessions remain. Actual: the task is marked `status = "completed"`, `actual_duration_minutes` is set to `planned_duration_minutes`, and the recurrence engine stops generating future sessions.
- User has a "Weekly review" recurring task. They complete one session via "Complete entire task". Expected: only that session is completed. Actual: all future weekly review sessions disappear from the calendar.
- User has a recurring task with only one remaining session. They complete it (no dialog shown, single-session path). Expected and Actual: session is completed correctly — this path is unaffected by the bug.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Completing a calendar session linked to a **non-recurring** task via "Complete entire task" must continue to mark the task as `completed` and mark all linked calendar events as completed
- Completing a calendar session linked to any task via "This session only" must continue to mark only that calendar event as completed without changing the task's status
- When a recurring task has no other incomplete sessions, completing the single session must continue to work without showing the completion choice dialog
- Mouse-based and direct checkbox interactions with calendar events must remain unaffected

**Scope:**
All inputs where `isBugCondition` returns false must be completely unaffected by this fix. This includes:

- Any completion choice for non-recurring tasks
- The `'session'` choice for recurring tasks
- The single-session path (no dialog) for recurring tasks

## Hypothesized Root Cause

Based on code analysis of `useCalendarDialogs.ts`:

1. **Missing `is_recurring` guard in `handleCompletionChoice`**: The `else` branch (choice === `'task'`) unconditionally calls `taskService.completeTaskWithEvents(task)` without checking `task.is_recurring`. This is the primary cause.

2. **`completeTaskWithEvents` has no recurring guard**: The function in `taskService.ts` calls `setTaskCompleted(task, true)` which sets `actual_duration_minutes = Math.max(planned_duration_minutes, 1)`. For recurring tasks, `actual_duration_minutes` is used by the recurrence engine to determine completion state — setting it to `planned_duration_minutes` signals "done forever".

3. **Dialog offers a misleading option for recurring tasks**: `CalendarCompletionDialog` always shows "Complete entire task" regardless of whether the task is recurring. The dialog receives `sessionCount` but not `isRecurring`, so it cannot adapt its options.

4. **`handleUpdateCompletion` does not pass task metadata to the dialog**: When opening the completion choice dialog, the hook stores `sessionCount` but not the `is_recurring` flag of the linked task, so the dialog and the choice handler both lack the context needed to behave correctly.

## Correctness Properties

Property 1: Bug Condition - Recurring Task Completion Completes Only the Occurrence

_For any_ calendar event where the linked task has `is_recurring = true` and the user chooses `'task'` in the completion dialog, the fixed `handleCompletionChoice` function SHALL complete only the selected calendar event (identical behavior to choosing `'session'`), leaving the recurring task's `status` and `actual_duration_minutes` unchanged.

**Validates: Requirement 2.1**

Property 2: Preservation - Non-Recurring Task Completion Behavior Unchanged

_For any_ calendar event where the linked task has `is_recurring = false` and the user chooses `'task'` in the completion dialog, the fixed `handleCompletionChoice` function SHALL continue to call `completeTaskWithEvents`, marking the task as completed and completing all linked calendar events — preserving the existing non-recurring task completion behavior.

**Validates: Requirements 3.1, 3.2**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct:

**File**: `frontend/src/components/Calendar/hooks/useCalendarDialogs.ts`

**Function**: `handleCompletionChoice`

**Specific Changes**:

1. **Fetch task before branching on choice**: The task is already fetched in the `'task'` branch. Move the `getTaskById` call before the `if (choice === 'session')` branch so `is_recurring` is available for both paths.

2. **Add `is_recurring` guard**: In the `'task'` branch, check `task.is_recurring`. If true, route to `completeSingleEvent` instead of `completeTaskWithEvents`.

3. **Pass `isRecurring` to the dialog state**: Add an `isRecurring` boolean to the completion choice dialog state so the dialog can adapt its UI.

**File**: `frontend/src/components/Calendar/CalendarCompletionDialog.tsx`

**Specific Changes**:

4. **Add `isRecurring` prop**: Accept an `isRecurring?: boolean` prop. When true, hide the "Complete entire task" button (or relabel it to "Complete this occurrence") so the dialog is not misleading for recurring tasks.

**File**: `frontend/src/components/Calendar/hooks/useCalendarDialogs.ts`

**Function**: `handleUpdateCompletion`

**Specific Changes**:

5. **Store `isRecurring` when opening dialog**: When setting `completionChoiceOpen = true`, also fetch or derive `is_recurring` from the linked task and store it in state so it can be passed to the dialog.

### Pseudocode for Fixed `handleCompletionChoice`

```
FUNCTION handleCompletionChoice(choice, setEvents)
  IF editEvent is null OR not a task event THEN RETURN

  setCompletionChoiceOpen(false)

  task = await taskService.getTaskById(editEvent.linked_task_id)

  IF choice = 'session' OR task.is_recurring = true THEN
    // For recurring tasks, 'task' choice behaves like 'session'
    await completeSingleEvent(true, setEvents)
    fireConfetti()
  ELSE
    // Non-recurring task: complete task + all events
    await taskService.completeTaskWithEvents(task)
    await refreshEvents()
    setEditOpen(false)
    onTaskDropped()
    fireConfetti()
    toast.success('Task completed')
  END IF
END FUNCTION
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that call `handleCompletionChoice('task', setEvents)` with a mocked recurring task and assert that `taskService.completeTaskWithEvents` is called (it should be on unfixed code) and that the task's `actual_duration_minutes` is modified. Run on unfixed code to observe the failure mode.

**Test Cases**:

1. **Recurring task + "Complete entire task"**: Call `handleCompletionChoice('task', ...)` with `is_recurring = true`. Assert `completeTaskWithEvents` is called — this will pass on unfixed code, confirming the bug path. (will fail the correct-behavior assertion on unfixed code)
2. **Recurring task status after completion**: After calling the handler, assert task `status !== 'completed'` and `actual_duration_minutes` is unchanged. (will fail on unfixed code)
3. **Dialog shows "Complete entire task" for recurring task**: Render `CalendarCompletionDialog` with a recurring task context and assert the misleading button is present. (will pass on unfixed code, confirming the UI issue)

**Expected Counterexamples**:

- `completeTaskWithEvents` is invoked for recurring tasks, setting `actual_duration_minutes = planned_duration_minutes`
- Possible causes: missing `is_recurring` check in `handleCompletionChoice`, no guard in `completeTaskWithEvents`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleCompletionChoice_fixed('task', setEvents)
  ASSERT taskService.completeTaskWithEvents NOT called
  ASSERT calendarService.updateCalendarEvent called with completed_at = now
  ASSERT task.status UNCHANGED
  ASSERT task.actual_duration_minutes UNCHANGED
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleCompletionChoice_original(input) = handleCompletionChoice_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many combinations of task state, session counts, and choice values automatically, catching edge cases that manual tests might miss.

**Test Cases**:

1. **Non-recurring task + "Complete entire task" preservation**: Verify `completeTaskWithEvents` is still called for `is_recurring = false` tasks after the fix
2. **Session-only choice preservation**: Verify `completeSingleEvent` is called for `choice = 'session'` regardless of `is_recurring` value
3. **Single-session recurring task (no dialog) preservation**: Verify the no-dialog path for recurring tasks with zero other incomplete sessions still calls `completeSingleEvent` directly

### Unit Tests

- Test `handleCompletionChoice('task', ...)` with `is_recurring = true` — assert only the event is completed, task is untouched
- Test `handleCompletionChoice('task', ...)` with `is_recurring = false` — assert `completeTaskWithEvents` is called
- Test `handleCompletionChoice('session', ...)` with both `is_recurring = true` and `false` — assert `completeSingleEvent` is called in both cases
- Test `CalendarCompletionDialog` renders without "Complete entire task" when `isRecurring = true`
- Test edge case: recurring task where `getTaskById` throws — assert graceful fallback to session-only completion

### Property-Based Tests

- Generate random `Task` objects with `is_recurring = true` and random `choice` values — verify `completeTaskWithEvents` is never called
- Generate random `Task` objects with `is_recurring = false` and `choice = 'task'` — verify `completeTaskWithEvents` is always called (preservation)
- Generate random combinations of session counts and `is_recurring` values — verify dialog display logic is consistent

### Integration Tests

- Full flow: open edit dialog for a recurring task event, check completion, choose "Complete entire task", verify only the event is marked completed and the task remains active with future sessions intact
- Full flow: open edit dialog for a non-recurring task event, choose "Complete entire task", verify task is marked completed and all events are completed
- Full flow: open edit dialog for a recurring task event with no other incomplete sessions, verify no dialog is shown and the single session is completed directly
