import { test, expect, type Page, type Route } from '@playwright/test';
import { mockTasks, mockProjects, apiSuccess } from './fixtures/apiMocks';

/**
 * Day-block feature E2E tests.
 *
 * Exercises the preview → confirm flow where a user clicks the "moon" button
 * on a day header to block the rest of that day and reschedule its tasks.
 *
 * Backend API calls are intercepted with page.route() — no live backend needed.
 */

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

interface MockHandles {
  previewRequests: Array<{ date: string; from_time: string }>;
  createRequests: Array<{ date: string; from_time: string }>;
  deleteRequests: string[];
  previewResponse: {
    tasksToMove: Array<{
      task: { id: string; title: string };
      currentEvent: Record<string, unknown>;
      proposedTime: { start: string; end: string } | null;
    }>;
    totalEventsCreated: number;
    totalEventsDeleted: number;
    violations: number;
    blockEndTime: string;
    isNonWorkingDay: boolean;
  };
  overlapResponse: 'none' | 'overlap';
}

async function setupMocks(
  page: Page,
  opts: Partial<MockHandles> = {}
): Promise<MockHandles> {
  const state: MockHandles = {
    previewRequests: [],
    createRequests: [],
    deleteRequests: [],
    previewResponse: opts.previewResponse ?? {
      tasksToMove: [
        {
          task: { id: 'task-1', title: 'Write unit tests' },
          currentEvent: {
            id: 'evt-1',
            linked_task_id: 'task-1',
            start_time: new Date(Date.now() + 3600_000).toISOString(),
            end_time: new Date(Date.now() + 7200_000).toISOString(),
          },
          proposedTime: {
            start: new Date(Date.now() + 86400_000).toISOString(),
            end: new Date(Date.now() + 90000_000).toISOString(),
          },
        },
      ],
      totalEventsCreated: 1,
      totalEventsDeleted: 1,
      violations: 0,
      blockEndTime: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
      isNonWorkingDay: false,
    },
    overlapResponse: opts.overlapResponse ?? 'none',
  };

  // NOTE: routes are matched in REVERSE registration order (most recent first).
  // Register the catch-all FIRST so specific handlers registered afterwards
  // take priority.
  await page.route('http://localhost:3003/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'OK', data: [] }),
    })
  );

  await page.route('http://localhost:3003/api/tasks*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess(mockTasks, 'OK', mockTasks.length)),
    })
  );

  await page.route('http://localhost:3003/api/projects*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess(mockProjects, 'OK', mockProjects.length)),
    })
  );

  await page.route('http://localhost:3003/api/calendar-events*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess([], 'OK', 0)),
    })
  );

  await page.route('http://localhost:3003/api/schedules*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess([mockSchedule], 'OK', 1)),
    })
  );

  await page.route('http://localhost:3003/api/user-settings*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiSuccess(mockUserSettings, 'OK')),
    })
  );

  // Day-block endpoints
  await page.route(
    'http://localhost:3003/api/day-blocks/preview',
    async (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON() as {
        date: string;
        from_time: string;
      };
      state.previewRequests.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(state.previewResponse, 'Preview generated')
        ),
      });
    }
  );

  await page.route(
    'http://localhost:3003/api/day-blocks',
    async (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON() as {
        date: string;
        from_time: string;
      };
      state.createRequests.push(body);

      if (state.overlapResponse === 'overlap') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'A day block already exists for this window',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(
            {
              day_block: {
                id: 'db-new-1',
                title: 'Day blocked',
                start_time: new Date().toISOString(),
                end_time: state.previewResponse.blockEndTime,
                is_day_block: true,
                user_id: 'user-1',
              },
              schedule_result: {
                unchanged: false,
                eventsCreated: 1,
                eventsDeleted: 1,
                violations: 0,
              },
            },
            'Day blocked'
          )
        ),
      });
    }
  );

  await page.route(/.*\/api\/day-blocks\/[^/]+$/, async (route: Route) => {
    // The preview endpoint also matches this regex — let it fall through.
    const url = route.request().url();
    if (url.endsWith('/preview')) return route.fallback();
    if (route.request().method() !== 'DELETE') return route.fallback();
    const id = url.split('/').pop() ?? '';
    state.deleteRequests.push(id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiSuccess(
          {
            schedule_result: {
              unchanged: false,
              eventsCreated: 0,
              eventsDeleted: 0,
              violations: 0,
            },
          },
          'Day block removed'
        )
      ),
    });
  });

  return state;
}

/** Click the moon "block day" button on the first non-past day of the week header. */
async function clickFirstBlockDayButton(page: Page) {
  // Moon buttons have title starting with "Block ..." (today or future variant)
  const moonBtn = page
    .getByRole('button')
    .filter({
      hasText: '',
    })
    .and(page.locator('button[title^="Block"]'))
    .first();
  await expect(moonBtn).toBeVisible({ timeout: 15_000 });
  await moonBtn.click();
}

test.describe('Day block — preview / confirm flow', () => {
  test('shows the moon "block day" button in the week header', async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto('/calendar');
    const moonBtn = page.locator('button[title^="Block"]').first();
    await expect(moonBtn).toBeVisible({ timeout: 15_000 });
  });

  test('clicking the moon button triggers a preview call and opens the dialog', async ({
    page,
  }) => {
    const handles = await setupMocks(page);
    await page.goto('/calendar');

    await clickFirstBlockDayButton(page);

    // Wait for preview call to have been made
    await expect
      .poll(() => handles.previewRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);

    // The confirmation dialog should appear with the rescheduling text
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Task name from the mocked preview appears
    await expect(dialog.getByText('Write unit tests')).toBeVisible();
    // Confirm button label indicates one task will move
    await expect(
      dialog.getByRole('button', { name: /Block day — 1 task will move/i })
    ).toBeVisible();
  });

  test('confirming the dialog calls POST /api/day-blocks and closes', async ({
    page,
  }) => {
    const handles = await setupMocks(page);
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const confirm = dialog.getByRole('button', { name: /Block day/i });
    await confirm.click();

    // POST /api/day-blocks should be called
    await expect
      .poll(() => handles.createRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });

  test('the preview body sends the correct date and from_time format', async ({
    page,
  }) => {
    const handles = await setupMocks(page);
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    await expect
      .poll(() => handles.previewRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);

    const payload = handles.previewRequests[0]!;
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.from_time).toMatch(/^\d{2}:\d{2}$/);
  });

  test('Cancel closes the dialog without creating a day block', async ({
    page,
  }) => {
    const handles = await setupMocks(page);
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    expect(handles.createRequests).toHaveLength(0);
  });

  test('non-working-day warning is rendered when the server flags it', async ({
    page,
  }) => {
    const handles = await setupMocks(page, {
      previewResponse: {
        tasksToMove: [],
        totalEventsCreated: 0,
        totalEventsDeleted: 0,
        violations: 0,
        blockEndTime: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
        isNonWorkingDay: true,
      },
    });
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/non-working day/i)).toBeVisible();
    expect(handles.previewRequests.length).toBeGreaterThan(0);
  });

  test('violation warning is shown when server reports scheduling violations', async ({
    page,
  }) => {
    await setupMocks(page, {
      previewResponse: {
        tasksToMove: [],
        totalEventsCreated: 0,
        totalEventsDeleted: 0,
        violations: 3,
        blockEndTime: new Date().toISOString(),
        isNonWorkingDay: false,
      },
    });
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByText(/3 tasks cannot be rescheduled/i)
    ).toBeVisible();
  });

  test('409 conflict from the create endpoint surfaces as an error toast', async ({
    page,
  }) => {
    await setupMocks(page, { overlapResponse: 'overlap' });
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: /Block day/i }).click();

    // A toast with "already exists" should appear
    await expect(page.getByText(/already exists/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('empty-preview shows "no tasks" message and still allows confirming', async ({
    page,
  }) => {
    const handles = await setupMocks(page, {
      previewResponse: {
        tasksToMove: [],
        totalEventsCreated: 0,
        totalEventsDeleted: 0,
        violations: 0,
        blockEndTime: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
        isNonWorkingDay: false,
      },
    });
    await page.goto('/calendar');
    await clickFirstBlockDayButton(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByText(/No tasks are currently scheduled/i)
    ).toBeVisible();

    // Confirm button uses the fallback label when no tasks move
    await dialog.getByRole('button', { name: /^Block day$/i }).click();
    await expect
      .poll(() => handles.createRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});
