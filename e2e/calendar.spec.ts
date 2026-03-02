import { test, expect } from '@playwright/test';
import { mockCalendarEvents, mockTasks, mockProjects, apiSuccess } from './fixtures/apiMocks';

/**
 * Calendar page E2E tests.
 *
 * Runs against the Next.js dev server (auth bypass active).
 * All backend API calls are intercepted with page.route().
 */

test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GET /calendar-events
    await page.route('http://localhost:3003/api/calendar-events*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(
            mockCalendarEvents,
            'Events retrieved successfully',
            mockCalendarEvents.length
          )
        ),
      })
    );

    // Mock GET /tasks (used by CalendarTasksPanel)
    await page.route('http://localhost:3003/api/tasks*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(mockTasks, 'Tasks retrieved successfully', mockTasks.length)
        ),
      })
    );

    // Mock GET /projects
    await page.route('http://localhost:3003/api/projects*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(
            mockProjects,
            'Projects retrieved successfully',
            mockProjects.length
          )
        ),
      })
    );

    // Mock user-settings endpoints
    await page.route('http://localhost:3003/api/user-settings*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess(null, 'OK')),
      })
    );

    // Catch-all for any other API calls
    await page.route('http://localhost:3003/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      })
    );

    await page.goto('/calendar');
  });

  test('renders the calendar page without error', async ({ page }) => {
    // The page should load without navigating away or showing an error
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('shows a week navigation control', async ({ page }) => {
    // Week calendar should show navigation buttons (prev/next week)
    const navButtons = page.getByRole('button').filter({ hasText: /today|week/i });
    // At least "Today" button should appear
    await expect(navButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows the Tasks side panel on desktop', async ({ page }) => {
    // The Tasks heading in the side panel
    await expect(page.getByText('Tasks').first()).toBeVisible({ timeout: 10_000 });
  });

  test('has a panel toggle button', async ({ page }) => {
    // The toggle button for the task panel
    const toggle = page.getByRole('button', { name: /hide tasks|show tasks/i });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });
});
