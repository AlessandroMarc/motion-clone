# Bugfix Requirements Document

## Introduction

When completing a session (calendar event) linked to a recurring task, the system presents a dialog asking whether to complete "this session only" or the "entire task". For recurring tasks, completing the "entire task" should only complete the current occurrence — not mark the whole recurring activity as permanently done. The current behavior incorrectly applies the full task completion path (setting `actual_duration_minutes` to `planned_duration_minutes` and marking status as `completed`) to recurring tasks, which breaks the recurrence model.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user completes a calendar session linked to a recurring task AND chooses "Complete entire task" in the completion dialog THEN the system marks the recurring task itself as `completed` (status = "completed") by setting `actual_duration_minutes` equal to `planned_duration_minutes`

1.2 WHEN a recurring task is marked as `completed` via the "Complete entire task" path THEN the system stops generating future occurrences for that recurring task

1.3 WHEN a user completes a calendar session linked to a recurring task AND chooses "Complete entire task" THEN the system calls `completeTaskWithEvents` which uses `setTaskCompleted` — a path designed for non-recurring tasks — without checking `is_recurring`

### Expected Behavior (Correct)

2.1 WHEN a user completes a calendar session linked to a recurring task, he is not asked what he wants to complete; it is always the specific occurrence.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user completes a calendar session linked to a non-recurring task AND chooses "Complete entire task" THEN the system SHALL CONTINUE TO mark the task as completed and mark all linked calendar events as completed

3.2 WHEN a user completes a calendar session linked to a non-recurring task AND chooses "This session only" THEN the system SHALL CONTINUE TO mark only that calendar event as completed without changing the task's status

3.3 WHEN a user completes a calendar session linked to a recurring task AND chooses "This session only" THEN the system SHALL CONTINUE TO mark only that calendar event as completed without changing the recurring task's status

3.4 WHEN a recurring task has no other incomplete sessions THEN the system SHALL CONTINUE TO complete the single session without showing the completion choice dialog
