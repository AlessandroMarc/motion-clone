
^C
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % git merge origin/main
Auto-merging frontend/src/components/Calendar/hooks/useAutoSchedule.ts
CONFLICT (content): Merge conflict in frontend/src/components/Calendar/hooks/useAutoSchedule.ts
CONFLICT (modify/delete): frontend/src/components/Tasks/forms/TaskCreateCardForm.tsx deleted in origin/main and modified in HEAD.  Version HEAD of frontend/src/components/Tasks/forms/TaskCreateCardForm.tsx left in tree.
Auto-merging frontend/src/components/Tasks/forms/index.ts
CONFLICT (content): Merge conflict in frontend/src/components/Tasks/forms/index.ts
Auto-merging frontend/src/content/changelog.ts
CONFLICT (content): Merge conflict in frontend/src/content/changelog.ts
Auto-merging frontend/src/services/transforms.ts
Automatic merge failed; fix conflicts and then commit the result.
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % git stash
frontend/src/components/Calendar/hooks/useAutoSchedule.ts: needs merge
frontend/src/utils/autoScheduleCalculator.ts: needs merge
error: could not write index
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % 
 *  History restored 


 *  History restored 

alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % clear
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % npm run dev

> motion-clone@1.0.0 dev
> concurrently "npm:dev-f" "npm:dev-b"

[dev-f] 
[dev-f] > motion-clone@1.0.0 dev-f
[dev-f] > npm --prefix frontend run dev
[dev-f] 
[dev-b] 
[dev-b] > motion-clone@1.0.0 dev-b
[dev-b] > npm --prefix backend run dev
[dev-b] 
[dev-f] 
[dev-f] > frontend@0.1.0 dev
[dev-f] > next dev
[dev-f] 
[dev-b] 
[dev-b] > backend@1.0.0 dev
[dev-b] > nodemon --exec "tsx" src/index.ts --watch
[dev-b] 
[dev-b] [nodemon] 3.1.11
[dev-b] [nodemon] to restart at any time, enter `rs`
[dev-b] [nodemon] watching path(s): *.*
[dev-b] [nodemon] watching extensions: ts,json
[dev-b] [nodemon] starting `tsx src/index.ts`
[dev-f] ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
[dev-f]  We detected multiple lockfiles and selected the directory of /Users/alessandromarchesin/repo/motion-clone/package-lock.json as the root directory.
[dev-f]  To silence this warning, set `turbopack.root` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
[dev-f]    See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
[dev-f]  Detected additional lockfiles: 
[dev-f]    * /Users/alessandromarchesin/repo/motion-clone/frontend/package-lock.json
[dev-f] 
[dev-f] ▲ Next.js 16.1.6 (Turbopack)
[dev-f] - Local:         http://localhost:3000
[dev-f] - Network:       http://172.20.10.11:3000
[dev-f] - Environments: .env
[dev-f] - Experiments (use with caution):
[dev-f]   ✓ externalDir
[dev-f] 
[dev-f] ✓ Starting...
[dev-b] [dotenv@17.2.4] injecting env (23) from ../.env -- tip: ⚙️  suppress all logs with { quiet: true }
[dev-b] Environment variable warnings:
[dev-b]   - PORT not set, using default value
[dev-b] Environment variable warnings:
[dev-b]   - PORT not set, using default value
[dev-b] [SyncScheduler] Starting sync scheduler (every 15 minutes)
[dev-b] Server is running on port 3003
[dev-f] ✓ Ready in 1999ms
[dev-f] Environment variable warnings:
[dev-f]   - NEXT_PUBLIC_API_URL not set, will use default based on NODE_ENV
[dev-f]  GET / 200 in 1487ms (compile: 1207ms, render: 279ms)
[dev-f]  GET /calendar 200 in 494ms (compile: 481ms, render: 13ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [UserSettingsService] getActiveSchedule cache miss took 1275ms (fetched 2 schedules)
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 133ms (cached 2 schedules)
[dev-b] [UserSettingsService] Fetched 2 schedules in 255ms
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 65ms (cached 2 schedules)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [GoogleCalendarService] Sync already in progress for user f53766ae-5476-45e6-a7d9-91d890903c78, reusing in-flight sync
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [GoogleCalendarService] Processing 259 events from Google Calendar
[dev-b] [GoogleCalendarService] Fetched 262 existing events in 128ms
[dev-b] [GoogleCalendarService] Classified events in 3ms: 0 to create, 0 to update, 0 skipped
[dev-b] [GoogleCalendarService] Sync complete: 259 synced, 0 skipped, 0 errors, 1631ms (fetch: 128ms, classify: 3ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 320 calendar events
[dev-b] [AutoSchedule] enriched to 320 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 100ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 55
[dev-b] [AutoSchedule] schedule differs — applying...
[dev-b] [AutoSchedule:diff] { toCreate: 8, toDelete: 14 }
[dev-b] [CalendarEventService] Batch inserting 8 calendar events
[dev-b] [CalendarEventService] Batch deleting 14 calendar events
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 79ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 118ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
^C[dev-b] npm run dev-b exited with code SIGINT
[dev-f] 
[dev-f] npm run dev-f exited with code 0
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % npm i 

up to date, audited 1231 packages in 10s

235 packages are looking for funding
  run `npm fund` for details

8 vulnerabilities (1 low, 3 moderate, 4 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % npm audit fix

changed 13 packages, and audited 1231 packages in 15s

235 packages are looking for funding
  run `npm fund` for details

# npm audit report

dompurify  >=3.1.3
Severity: moderate
DOMPurify contains a Cross-site Scripting vulnerability - https://github.com/advisories/GHSA-v2wj-7wpq-c8vv
fix available via `npm audit fix --force`
Will install posthog-js@1.316.1, which is a breaking change
node_modules/dompurify
  posthog-js  >=1.317.0
  Depends on vulnerable versions of dompurify
  node_modules/posthog-js

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force
alessandromarchesin@MacBook-Air-di-Alessandro-2 motion-clone % npm run dev

> motion-clone@1.0.0 dev
> concurrently "npm:dev-f" "npm:dev-b"

[dev-f] 
[dev-f] > motion-clone@1.0.0 dev-f
[dev-f] > npm --prefix frontend run dev
[dev-f] 
[dev-b] 
[dev-b] > motion-clone@1.0.0 dev-b
[dev-b] > npm --prefix backend run dev
[dev-b] 
[dev-f] 
[dev-f] > frontend@0.1.0 dev
[dev-f] > next dev
[dev-f] 
[dev-b] 
[dev-b] > backend@1.0.0 dev
[dev-b] > nodemon --exec "tsx" src/index.ts --watch
[dev-b] 
[dev-b] [nodemon] 3.1.11
[dev-b] [nodemon] to restart at any time, enter `rs`
[dev-b] [nodemon] watching path(s): *.*
[dev-b] [nodemon] watching extensions: ts,json
[dev-b] [nodemon] starting `tsx src/index.ts`
[dev-b] [dotenv@17.2.4] injecting env (23) from ../.env -- tip: ✅ audit secrets and track compliance: https://dotenvx.com/ops
[dev-f] ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
[dev-f]  We detected multiple lockfiles and selected the directory of /Users/alessandromarchesin/repo/motion-clone/package-lock.json as the root directory.
[dev-f]  To silence this warning, set `turbopack.root` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
[dev-f]    See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
[dev-f]  Detected additional lockfiles: 
[dev-f]    * /Users/alessandromarchesin/repo/motion-clone/frontend/package-lock.json
[dev-f] 
[dev-f] ▲ Next.js 16.1.6 (Turbopack)
[dev-f] - Local:         http://localhost:3000
[dev-f] - Network:       http://172.20.10.11:3000
[dev-f] - Environments: .env
[dev-f] - Experiments (use with caution):
[dev-f]   ✓ externalDir
[dev-f] 
[dev-f] ✓ Starting...
[dev-f] ✓ Ready in 855ms
[dev-b] Environment variable warnings:
[dev-b]   - PORT not set, using default value
[dev-b] Environment variable warnings:
[dev-b]   - PORT not set, using default value
[dev-b] [SyncScheduler] Starting sync scheduler (every 15 minutes)
[dev-b] Server is running on port 3003
[dev-f] Environment variable warnings:
[dev-f]   - NEXT_PUBLIC_API_URL not set, will use default based on NODE_ENV
[dev-f]  GET /calendar 200 in 986ms (compile: 723ms, render: 263ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [UserSettingsService] Fetched 2 schedules in 288ms
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [UserSettingsService] getActiveSchedule cache miss took 325ms (fetched 2 schedules)
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 100ms (cached 2 schedules)
[dev-b] [GoogleCalendarService] Sync already in progress for user f53766ae-5476-45e6-a7d9-91d890903c78, reusing in-flight sync
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [GoogleCalendarService] Processing 259 events from Google Calendar
[dev-b] [GoogleCalendarService] Fetched 262 existing events in 119ms
[dev-b] [GoogleCalendarService] Classified events in 3ms: 0 to create, 0 to update, 0 skipped
[dev-b] [GoogleCalendarService] Sync complete: 259 synced, 0 skipped, 0 errors, 804ms (fetch: 119ms, classify: 3ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 102ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 98ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 208ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 88ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 177ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 79ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-04T23:00:00.000Z',
[dev-b]   end_date: '2026-03-05T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-04T23:00:00.000Z',
[dev-b]   endDate: '2026-03-05T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 17 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 17 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-04T23:00:00.000Z',
[dev-b]   end_date: '2026-03-05T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-04T23:00:00.000Z',
[dev-b]   endDate: '2026-03-05T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 17 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 17 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [GoogleCalendarService] Sync already in progress for user f53766ae-5476-45e6-a7d9-91d890903c78, reusing in-flight sync
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [GoogleCalendarService] Processing 259 events from Google Calendar
[dev-b] [GoogleCalendarService] Fetched 262 existing events in 114ms
[dev-b] [GoogleCalendarService] Classified events in 8ms: 0 to create, 0 to update, 0 skipped
[dev-b] [GoogleCalendarService] Sync complete: 259 synced, 0 skipped, 0 errors, 705ms (fetch: 114ms, classify: 8ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 107ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 226ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 80ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 106ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 56ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 193ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 88ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 869ms (cached 2 schedules)
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-f]  GET /tasks 200 in 343ms (compile: 331ms, render: 12ms)
[dev-b] [UserSettingsService] Fetched 2 schedules in 201ms
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {}
[dev-b] [CalendarEventsRoute] Fetching all events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 152ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [ProjectService] Fetched 6 projects in 340ms
[dev-b] [CalendarEventsRoute] Returning events: { count: 314 }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {}
[dev-b] [CalendarEventsRoute] Fetching all events
[dev-b] [CalendarEventsRoute] Returning events: { count: 314 }
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 574ms (cached 2 schedules)
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 280ms (cached 2 schedules)
[dev-f]  GET /calendar 200 in 36ms (compile: 10ms, render: 26ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [UserSettingsService] Fetched 2 schedules in 230ms
[dev-b] [UserSettingsService] Fetched 2 schedules in 246ms
[dev-b] [GoogleCalendarService] Sync already in progress for user f53766ae-5476-45e6-a7d9-91d890903c78, reusing in-flight sync
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-05',
[dev-b]   end_date: '2026-03-11'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: { startDate: '2026-03-05', endDate: '2026-03-11' }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 40 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 40 }
[dev-b] [GoogleCalendarService] Processing 259 events from Google Calendar
[dev-b] [GoogleCalendarService] Fetched 262 existing events in 126ms
[dev-b] [GoogleCalendarService] Classified events in 3ms: 0 to create, 0 to update, 0 skipped
[dev-b] [GoogleCalendarService] Sync complete: 259 synced, 0 skipped, 0 errors, 1069ms (fetch: 126ms, classify: 3ms)
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] GET /api/calendar-events called
[dev-b] [CalendarEventsRoute] Query params: [Object: null prototype] {
[dev-b]   start_date: '2026-03-01T23:00:00.000Z',
[dev-b]   end_date: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventsRoute] Fetching events by date range
[dev-b] [CalendarEventService] getCalendarEventsByDateRange called: {
[dev-b]   startDate: '2026-03-01T23:00:00.000Z',
[dev-b]   endDate: '2026-03-08T22:59:59.999Z'
[dev-b] }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [CalendarEventService] Fetched calendar events: { count: 46 }
[dev-b] [CalendarEventsRoute] Returning events: { count: 46 }
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 78ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
[dev-b] [AutoSchedule] fetched 22 tasks
[dev-b] [AutoSchedule] fetched 314 calendar events
[dev-b] [AutoSchedule] enriched to 314 events
[dev-b] [UserSettingsService] getActiveSchedule cache hit in 94ms (cached 2 schedules)
[dev-b] [AutoSchedule] schedules: 2, active: 806f0bba-cf08-452e-8cf3-c85f59ea0810
[dev-b] [AutoSchedule] proposed: 49 events, existing: 49
[dev-b] [AutoSchedule] schedule unchanged — skipping
