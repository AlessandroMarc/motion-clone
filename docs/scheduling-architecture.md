# Backend Scheduling Architecture & Process

This document provides a detailed overview of the auto-scheduling engine in the backend, explaining how tasks are transformed into optimized calendar events.

## 1. Overview
The scheduling system is designed to automatically find the best time slots for tasks while respecting:
- Task dependencies (`blockedBy`)
- Due dates and priorities
- User working hours and schedules
- Existing calendar events (meetings and other tasks)
- Task recurrence patterns

---

## 2. The Orchestration Flow
**Core File:** [backend/src/services/autoScheduleService.ts](backend/src/services/autoScheduleService.ts)

The `AutoScheduleService` is the entry point. When a scheduling run is triggered:

1.  **Data Fetching**: It retrieves all active tasks, existing calendar events, and the user's working schedules from the database.
2.  **Horizon Enrichment**: For recurring tasks, it ensures a 90-day window is considered so future occurrences are "blocked off" even if they haven't been fully instantiated yet.
3.  **Calculation**: It delegates the core logic to `calculateAutoSchedule`.
4.  **Diffing (`isSameSchedule`)**: It compares the *new* proposed schedule against what is currently in the database to avoid unnecessary writes.
5.  **Atomic Update (`applyDiff`)**: If changes are needed, it performs a "wipe and replace" for the user's auto-scheduled events to ensure no duplicates or stale blocks remain.

---

## 3. The Sorting Strategy
**Core File:** [backend/src/utils/autoScheduleCalculator.ts](backend/src/utils/autoScheduleCalculator.ts)

Before finding slots, the engine must decide the order of operations.

### Topological Sort
The system first performs a topological sort based on the `blockedBy` array. 
- If **Task B** depends on **Task A**, Task A is *always* scheduled first.
- This ensures that Task B's start time is physically pushed after Task A's end time.

### Priority & Due Dates
Within the dependency tiers, tasks are sorted by:
1.  **Due Date**: Tasks expiring sooner get priority.
2.  **Priority Rank**: `high` > `medium` > `low`.
3.  **Continuation**: The `reorderTasksForContinuation` logic attempts to keep the user on the same task they were previously working on to minimize context switching.

---

## 4. The Slot Finding Logic ("The Physics Engine")
**Core File:** [backend/src/utils/taskScheduler.ts](backend/src/utils/taskScheduler.ts)

For each task in the sorted list:

### `distributeEvents`
This function attempts to fit the `planned_duration_minutes` into the calendar.
- **Starting Point**: Usually `now` (rounded to the next 15m) or the task's `start_date`.
- **Working Hours**: It checks the `Schedule` object for that day. If the user only works 9 AM - 5 PM on Mondays, it will skip Tuesday entirely.
- **Gap Management**: A default 5-minute buffer is maintained between events to prevent burnout.
- **Chunking**: If a 4-hour task only finds a 1-hour window, it schedules a 1-hour "chunk" and continues searching for the remaining 3 hours in the next available gap.

### `getNextAvailableSlot`
The low-level "searcher" that scans chronologically for a gap of at least `minBlockMinutes` (default 15) that doesn't overlap with:
- External calendar events (Google/Outlook sync)
- Already scheduled high-priority tasks
- Recurring task placeholders

---

## 5. Handling Violations
If a task has a `due_date`, the system tries its best to fit it before that date. If it cannot (due to time constraints or higher priority tasks), it will **still schedule the task** as soon as possible after the deadline, but it will return it in the `violations` array to notify the user.

---

## 6. Key Data Types
- **`Task`**: The raw unit of work.
- **`CalendarEventTask`**: A specific instance (block of time) on the calendar linked to a task.
- **`Schedule`**: Defines the "valid" hours for a specific day of the week.
- **`TaskSchedulingConfig`**: Holds defaults like `gapBetweenEventsMinutes` and `minBlockMinutes`.
