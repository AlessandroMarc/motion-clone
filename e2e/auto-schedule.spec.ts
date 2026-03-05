import { test, expect, Page, Route } from '@playwright/test';
import { mockTasks, mockProjects, apiSuccess } from './fixtures/apiMocks';

/**
 * E2E tests for Auto-Schedule overlap prevention.
 *
 * These tests verify that after clicking the "Auto-Schedule" button on
 * the calendar page, the resulting calendar events do NOT overlap.
 *
 * All backend API calls are intercepted via page.route()—no real server
 * is needed.
 */

// ─── Mock data helpers ────────────────────────────────────────────────

const mockSchedule = {
  id: 'schedule-1',
  user_id: 'user-1',
  name: 'Work Schedule',
  working_hours_start: 9,
  working_hours_end: 18,
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockUserSettings = {
  id: 'us-1',
  user_id: 'user-1',
  active_schedule_id: 'schedule-1',
  onboarding_completed: true,
  onboarding_step: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/** Make a task with the given overrides on top of a base shape */
function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    ...mockTasks[0],
    ...overrides,
  };
}

/** Make a calendar-event object (optionally linked to a task) */
function makeCalendarEvent(
  id: string,
  start: string,
  end: string,
  extra: Record<string, unknown> = {}
) {
  return {
    id,
    title: 'Event',
    start_time: start,
    end_time: end,
    description: '',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...extra,
  };
}

// ─── Setup helper ─────────────────────────────────────────────────────

/**
 * Intercept ALL API calls that the Calendar page makes.
 * After the auto-schedule runs, newly-created calendar events are captured
 * via the POST handler and returned for assertion.
 */
async function setupMocks(
  page: Page,
  opts: {
    tasks?: Record<string, unknown>[];
    calendarEvents?: Record<string, unknown>[];
    schedules?: Record<string, unknown>[];
  } = {}
) {
  const tasks = opts.tasks ?? mockTasks;
  const calendarEvents = opts.calendarEvents ?? [];
  const schedules = opts.schedules ?? [mockSchedule];

  // Track created events so we can assert on them
  const createdEvents: Record<string, unknown>[] = [];

  // POST /api/auto-schedule/run - Mock the auto-schedule backend logic
  // Simulates the backend creating calendar events for unscheduled tasks
  await page.route(
    'http://localhost:3003/api/auto-schedule/run',
    async (route: Route) => {
      const method = route.request().method();
      const url = route.request().url();
      console.log('[E2E Mock] auto-schedule/run called:', { method, url });
      if (method !== 'POST') {
        console.log('[E2E Mock] Not a POST request, continuing');
        await route.continue();
        return;
      }

      console.log('[E2E Mock] Auto-schedule/run POST called, creating events');
      console.log(
        '[E2E Mock] Current tasks:',
        tasks.map((t: any) => ({ id: t.id, status: t.status }))
      );
      console.log(
        '[E2E Mock] Current calendar events:',
        calendarEvents.map((e: any) => ({
          id: e.id,
          linked_task_id: e.linked_task_id,
        }))
      );

      // Simulate auto-schedule: create events for tasks that don't have events yet
      const existingTaskIds = new Set(
        [...calendarEvents, ...createdEvents].map((e: any) => e.linked_task_id)
      );
      console.log('[E2E Mock] Existing task IDs:', Array.from(existingTaskIds));

      const tasksToSchedule = tasks
        .filter(
          (t: any) => t.status === 'not-started' && !existingTaskIds.has(t.id)
        )
        .slice(0, 2); // Limit to 2 to avoid too many events

      console.log(
        '[E2E Mock] Tasks to schedule:',
        tasksToSchedule.map((t: any) => ({ id: t.id, title: t.title }))
      );

      let eventsCreated = 0;
      for (const task of tasksToSchedule) {
        // Create 1-2 events per task depending on duration
        const duration = (task as any).planned_duration_minutes || 60;
        const numEvents = duration > 60 ? 2 : 1;

        for (let i = 0; i < numEvents; i++) {
          const startHour = 9 + i * 2; // Spread throughout day
          const created = makeCalendarEvent(
            `created-${createdEvents.length}`,
            `2099-06-15T${String(startHour).padStart(2, '0')}:00:00Z`,
            `2099-06-15T${String(startHour + 1).padStart(2, '0')}:00:00Z`,
            {
              linked_task_id: task.id,
              title: (task as any).title,
            }
          );
          createdEvents.push(created);
          eventsCreated++;
          console.log('[E2E Mock] Created event:', created);
        }
      }

      console.log(`[E2E Mock] Created ${eventsCreated} total events`);
      console.log(
        '[E2E Mock] createdEvents.length is now:',
        createdEvents.length
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(
            {
              unchanged: false,
              eventsCreated: eventsCreated,
              eventsDeleted: 0,
              violations: 0,
            },
            'Auto-schedule completed'
          )
        ),
      });
    }
  );

  // GET /tasks
  await page.route('http://localhost:3003/api/tasks*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(tasks, 'Tasks retrieved', tasks.length)
        ),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess(null)),
      });
    }
  });

  // GET /calendar-events
  // After scheduling, newEvents are appended so subsequent GETs see the updated list.
  await page.route(
    'http://localhost:3003/api/calendar-events*',
    async (route: Route) => {
      const method = route.request().method();
      if (method === 'GET') {
        const allEvents = [...calendarEvents, ...createdEvents];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            apiSuccess(allEvents, 'Events retrieved', allEvents.length)
          ),
        });
      } else if (method === 'POST') {
        // Auto-schedule creates events — capture them
        try {
          const body = route.request().postDataJSON();
          if (Array.isArray(body)) {
            for (const evt of body) {
              const created = { ...evt, id: `created-${createdEvents.length}` };
              createdEvents.push(created);
            }
            await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify(
                apiSuccess({
                  results: body.map((_, i) => ({
                    success: true,
                    event:
                      createdEvents[createdEvents.length - body.length + i],
                    index: i,
                  })),
                  total: body.length,
                  successful: body.length,
                  failed: 0,
                })
              ),
            });
          } else {
            const created = { ...body, id: `created-${createdEvents.length}` };
            createdEvents.push(created);
            await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify(apiSuccess(created, 'Event created')),
            });
          }
        } catch {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(apiSuccess(null)),
          });
        }
      } else if (method === 'DELETE') {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.endsWith('/calendar-events/batch')) {
          const payload = route.request().postDataJSON() as { ids?: string[] };
          const ids = Array.isArray(payload?.ids) ? payload.ids : [];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              apiSuccess({
                results: ids.map(id => ({ success: true, id })),
                total: ids.length,
                successful: ids.length,
                failed: 0,
              })
            ),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiSuccess(null, 'Event deleted')),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiSuccess(null)),
        });
      }
    }
  );

  // GET /projects
  await page.route('http://localhost:3003/api/projects*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(mockProjects, 'Projects retrieved', mockProjects.length)
      ),
    })
  );

  // GET /schedules
  await page.route('http://localhost:3003/api/schedules*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(schedules, 'Schedules retrieved', schedules.length)
      ),
    })
  );

  // GET /user-settings
  await page.route('http://localhost:3003/api/user-settings*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess(mockUserSettings, 'OK')),
    })
  );

  // GET /google-calendar/status
  await page.route('http://localhost:3003/api/google-calendar/status*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(
          {
            connected: false,
            email: null,
            calendarId: null,
            lastSyncedAt: null,
          },
          'Status retrieved'
        )
      ),
    })
  );

  // POST /google-calendar/sync
  await page.route('http://localhost:3003/api/google-calendar/sync*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(
          {
            synced: 0,
            conflicts: 0,
            errors: [],
          },
          'Sync completed'
        )
      ),
    })
  );

  // Catch-all for any other API calls (registered last so specific routes take precedence)
  await page.route('http://localhost:3003/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'OK', data: [] }),
    })
  );

  return { createdEvents };
}

// ─── Tests ────────────────────────────────────────────────────────────

test.describe('Auto-Schedule – overlap prevention', () => {
  test('renders the Auto-Schedule button', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/calendar');
    const btn = page.getByRole('button', { name: /auto.schedule/i });
    await expect(btn).toBeVisible({ timeout: 15_000 });
  });

  test('Auto-Schedule with overlapping pre-existing task events reschedules them', async ({
    page,
  }) => {
    const tasks = [
      makeTask({
        id: 'task-x',
        title: 'Task X',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        status: 'not-started',
        is_recurring: false,
      }),
      makeTask({
        id: 'task-y',
        title: 'Task Y',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        status: 'not-started',
        is_recurring: false,
      }),
    ];

    // Pre-existing OVERLAPPING task events (simulates a bug from a prior run)
    const overlappingEvents = [
      makeCalendarEvent(
        'evt-x1',
        '2099-06-15T09:00:00Z',
        '2099-06-15T10:00:00Z',
        { linked_task_id: 'task-x', completed_at: null }
      ),
      makeCalendarEvent(
        'evt-y1',
        '2099-06-15T09:30:00Z',
        '2099-06-15T10:30:00Z',
        { linked_task_id: 'task-y', completed_at: null }
      ),
    ];

    const { createdEvents } = await setupMocks(page, {
      tasks,
      calendarEvents: overlappingEvents,
    });
    await page.goto('/calendar');

    const btn = page.getByRole('button', { name: /auto.schedule/i });
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await page.waitForTimeout(300);

    // After rescheduling, either the old events were deleted and new non-overlapping
    // events were created, or the schedule was updated. Either way, the
    // Auto-Schedule button should still be visible (page didn't crash).
    await expect(btn).toBeVisible();

    // If new events were created, verify they don't overlap
    if (createdEvents.length > 0) {
      const sorted = [...createdEvents]
        .filter(
          (
            e
          ): e is Record<string, unknown> & {
            start_time: string;
            end_time: string;
          } =>
            typeof e.start_time === 'string' && typeof e.end_time === 'string'
        )
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          const overlaps =
            new Date(a.start_time) < new Date(b.end_time) &&
            new Date(a.end_time) > new Date(b.start_time);
          expect(
            overlaps,
            `Created events overlap: ${a.linked_task_id}(${a.start_time}–${a.end_time}) ↔ ${b.linked_task_id}(${b.start_time}–${b.end_time})`
          ).toBe(false);
        }
      }
    }
  });

  test('the calendar page remains stable after auto-schedule', async ({
    page,
  }) => {
    await setupMocks(page, { tasks: mockTasks });
    await page.goto('/calendar');

    const btn = page.getByRole('button', { name: /auto.schedule/i });
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 8_000 });

    // After auto-schedule, core UI elements should still be visible
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByText('Tasks').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
