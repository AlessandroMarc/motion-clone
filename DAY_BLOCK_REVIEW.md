# Day Block Feature — Code Review Action Plan

## Critical (must fix before merge)

### 1. Remove `.qwen/settings.json`
- Delete the file and add `.qwen/` to `.gitignore`

### 2. Extract `DayBlockService` from the route file
- Move `simulateDayBlock()` and all business logic out of `dayBlocks.ts` route into `backend/src/services/dayBlockService.ts`
- Follow the existing pattern: service methods receive `SupabaseClient` as a parameter
- Remove the direct `getAuthenticatedSupabase(authToken)` call inside the simulation — pass the client in from the route
- Route file should only do: parse request, call service, return response

### 3. Fix timezone bugs (`new Date` traps)
- **Backend**: Replace `new Date(\`${date}T${fromTime}:00\`)` with `parseDateLocal()` from `taskScheduler.ts`, per CLAUDE.md rules
- **Backend**: Fix `floorTo15(new Date())` fallback — this uses server clock (UTC on Vercel), not user's local time. Either require `from_time` from the client (no server fallback) or accept a timezone parameter
- **Frontend dialog**: The end-time display calculates `new Date(dateStr).getTime() + hours * ms` which is UTC midnight + hours = wrong in non-UTC timezones. Instead, return the computed `endTime` from the backend preview response and display that directly

### 4. Fix `workingEnd` fractional hours
- `String(workingEnd).padStart(2, '0')` silently truncates `17.5` to `17`. Compute hours and minutes separately:
  ```typescript
  const hours = Math.floor(workingEnd);
  const minutes = Math.round((workingEnd - hours) * 60);
  ```

### 5. Authorization on DELETE endpoint
- Before deleting, fetch the event by ID and verify:
  - `event.user_id === authReq.userId` (ownership)
  - `event.is_day_block === true` (don't let this endpoint delete arbitrary events)
- Return 404 if not found, 403 if not owned

### 6. Add duplicate/idempotency guard
- Before creating a day block, query for existing day blocks that overlap the proposed `[startTime, endTime]` window
- If one exists, return a 409 Conflict or extend the existing block

---

## High (should fix before merge)

### 7. Fix `simulateDayBlock` proposed-time correlation
- `const proposed = proposedEvents[0] || null` takes the first proposed event regardless of which current chunk is being iterated
- Need to correlate by matching the chunk index or by finding the proposed event closest to the original time slot

### 8. Allow blocking future days, not just today
- The moon icon is gated on `isToday` — users can't pre-block tomorrow or a sick day
- Show the icon on future days too (or at least allow it via the API; the backend already supports any date)

### 9. Remove frontend type casts — use the shared type
- `(event as CalendarEventUnion & { is_day_block?: boolean }).is_day_block` appears in 3 files
- `is_day_block` is already on `CalendarEvent` in `shared/types.ts` — ensure the type flows through the union correctly so casts aren't needed
- If `isCalendarEventTask` narrows it away, add an `isCalendarEventDayBlock` type guard

### 10. Preview staleness (TOCTOU)
- Between preview and confirm, the calendar state can change (other tabs, Google sync, background scheduler)
- Options:
  - Return an `etag` / `schedule_version` from preview, send it back on create, reject if stale
  - Or: accept the race and just show a toast if the final result differs from preview ("2 tasks rescheduled instead of 3")
  - At minimum: document the known limitation

---

## Medium (fix soon after merge)

### 11. Add tests
- Backend: route-level tests with supertest (happy path create, delete, preview; auth rejection; duplicate block; non-owner delete)
- Backend: unit tests for the extracted `DayBlockService.simulate()` logic
- Frontend: test the confirmation dialog renders preview data correctly

### 12. Handle edge case: blocking a non-working day
- If `daySchedule` is `null` (Sunday), the fallback creates a block from 9-18 on a day with no tasks. Either:
  - Reject with "this is a non-working day" error
  - Or allow it but warn the user in the preview

### 13. Handle edge case: no remaining scheduling horizon
- If the block covers all remaining working hours for the foreseeable future, tasks have nowhere to go — the auto-scheduler will produce violations for everything
- Surface this clearly in the preview ("X tasks cannot be rescheduled within the next 7 days")

### 14. Migration strategy
- `backend/migrations/add_is_day_block_to_calendar_events.sql` exists but nothing applies it
- Document or automate how this gets run (Supabase CLI migration, manual apply, etc.)

### 15. Confirmation button text is misleading
- Button says `Block 3 tasks` but the action is blocking the **day**, not selecting tasks
- Change to: `Block day — 3 tasks will move` (or similar)
- File: `frontend/src/components/Calendar/WeekCalendarContainer.tsx` ~line 815

### 16. No loading indicator during preview fetch
- User clicks moon icon → nothing happens until preview API returns (can be 1-2s)
- Add a spinner to the moon button while `dayBlockPreviewLoading` is true
- Or show a toast: "Calculating schedule changes..."
- File: `frontend/src/components/Calendar/WeekScrollableGrid.tsx` ~line 170

### 17. Recurring synthetic events not shown in preview comparison
- `currentTaskEvents` only includes persisted events, not recurring synthetics
- If a recurring task's synthetic occurrence overlaps the block, it won't appear in `tasksToMove`
- Either include synthetics in the "current" set, or add a UI note: "Recurring tasks are rescheduled automatically"
- File: `backend/src/routes/dayBlocks.ts` ~line 108
