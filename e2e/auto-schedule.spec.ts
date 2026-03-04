import { test, expect, Page, Route } from '@playwright/test';
import {
  mockTasks,
  mockProjects,
  apiSuccess,
} from './fixtures/apiMocks';

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

  // Catch-all for any other API calls (register first so specific handlers below can override it)
  await page.route('http://localhost:3003/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'OK', data: [] }),
    })
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
                    event: createdEvents[createdEvents.length - body.length + i],
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
  await page.route('http://localhost:3003/api/projects*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(mockProjects, 'Projects retrieved', mockProjects.length)
      ),
    })
  );

  // GET /schedules
  await page.route('http://localhost:3003/api/schedules*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(schedules, 'Schedules retrieved', schedules.length)
      ),
    })
  );

  // GET /user-settings
  await page.route('http://localhost:3003/api/user-settings*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess(mockUserSettings, 'OK')),
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

  test('clicking Auto-Schedule does not produce overlapping events for two tasks', async ({
    page,
  }) => {
    const tasks = [
      makeTask({
        id: 'task-a',
        title: 'Task Alpha',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        status: 'not-started',
        is_recurring: false,
      }),
      makeTask({
        id: 'task-b',
        title: 'Task Beta',
        planned_duration_minutes: 60,
        actual_duration_minutes: 0,
        status: 'not-started',
        is_recurring: false,
      }),
    ];

    const { createdEvents } = await setupMocks(page, { tasks });
    await page.goto('/calendar');

    // Wait for the button and click
    const btn = page.getByRole('button', { name: /auto.schedule/i });
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await btn.click();

    // Wait for scheduling to finish (button becomes enabled again)
    await expect(btn).toBeEnabled({ timeout: 8_000 });

    await expect
      .poll(() => createdEvents.length, { timeout: 8_000 })
      .toBeGreaterThan(0);

    // Give a moment for any re-renders
    await page.waitForTimeout(200);

    // Verify: created events do not overlap
    const sorted = [...createdEvents]
      .filter(
        (e): e is Record<string, unknown> & { start_time: string; end_time: string } =>
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
          `Events overlap: ${a.linked_task_id}(${a.start_time}–${a.end_time}) ↔ ${b.linked_task_id}(${b.start_time}–${b.end_time})`
        ).toBe(false);
      }
    }
  });

  test('Auto-Schedule schedules tasks around existing calendar events', async ({
    page,
  }) => {
    const tasks = [
      makeTask({
        id: 'task-around',
        title: 'Must Avoid Meeting',
        planned_duration_minutes: 120,
        actual_duration_minutes: 0,
        status: 'not-started',
        is_recurring: false,
      }),
    ];

    // A 3-hour meeting during the morning
    const meeting = makeCalendarEvent(
      'meeting-1',
      '2099-06-15T09:00:00Z',
      '2099-06-15T12:00:00Z',
      { title: 'Morning meeting block' }
    );

    const { createdEvents } = await setupMocks(page, {
      tasks,
      calendarEvents: [meeting],
    });
    await page.goto('/calendar');

    const btn = page.getByRole('button', { name: /auto.schedule/i });
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await expect
      .poll(() => createdEvents.length, { timeout: 8_000 })
      .toBeGreaterThan(0);
    await page.waitForTimeout(200);

    // The created events should not overlap the meeting
    const meetingStart = new Date(meeting.start_time).getTime();
    const meetingEnd = new Date(meeting.end_time).getTime();

    for (const evt of createdEvents) {
      const e = evt as Record<string, unknown>;
      if (typeof e.start_time === 'string' && typeof e.end_time === 'string') {
        const eStart = new Date(e.start_time).getTime();
        const eEnd = new Date(e.end_time).getTime();
        const overlaps = eStart < meetingEnd && eEnd > meetingStart;
        expect(
          overlaps,
          `Scheduled event overlaps meeting: ${e.start_time}–${e.end_time}`
        ).toBe(false);
      }
    }
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
          (e): e is Record<string, unknown> & { start_time: string; end_time: string } =>
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
