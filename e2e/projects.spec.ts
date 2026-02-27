import { test, expect } from '@playwright/test';
import { mockProjects, mockTasks, apiSuccess } from './fixtures/apiMocks';

/**
 * Project management E2E tests.
 *
 * Runs against the Next.js dev server (auth bypass active).
 * All backend API calls are intercepted with page.route().
 */

test.describe('Projects page', () => {
  test.beforeEach(async ({ page }) => {
    // IMPORTANT: Playwright executes route handlers in LIFO order (last
    // registered = first executed).  Register the catch-all FIRST so it
    // runs LAST, letting the specific handlers below take precedence.
    await page.route('http://localhost:3003/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      })
    );

    // Mock GET /projects
    await page.route('http://localhost:3003/api/projects*', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            apiSuccess(
              mockProjects,
              'Projects retrieved successfully',
              mockProjects.length
            )
          ),
        });
      }
      return route.continue();
    });

    // Mock GET /tasks (used by project list for scheduling status)
    await page.route('http://localhost:3003/api/tasks*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(mockTasks, 'Tasks retrieved successfully', mockTasks.length)
        ),
      })
    );

    // Mock GET /calendar-events (used by project list for scheduling status)
    await page.route('http://localhost:3003/api/calendar-events*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess([], 'OK', 0)),
      })
    );

    await page.goto('/projects');
  });

  test('shows the Project Manager heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /project manager/i })
    ).toBeVisible();
  });

  test('displays the page subtitle', async ({ page }) => {
    await expect(
      page.getByText(/organize your larger goals and track project progress/i)
    ).toBeVisible();
  });

  test('has a "Your Projects" section heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /your projects/i })
    ).toBeVisible();
  });

  test('shows project names from API response', async ({ page }) => {
    await expect(page.getByText('Test Project Alpha')).toBeVisible();
    await expect(page.getByText('Test Project Beta')).toBeVisible();
  });

  test('shows a project creation button', async ({ page }) => {
    const createBtn = page
      .getByRole('button')
      .filter({ hasText: /new project|add project|create/i })
      .first();
    await expect(createBtn).toBeVisible();
  });
});
