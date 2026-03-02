import { test, expect } from '@playwright/test';
import { mockTasks, mockProjects, apiSuccess } from './fixtures/apiMocks';

/**
 * Task management E2E tests.
 *
 * Runs against the Next.js dev server (auth bypass active).
 * All backend API calls are intercepted with page.route().
 */

test.describe('Tasks page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GET /tasks → return fixture tasks
    await page.route('http://localhost:3003/api/tasks*', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            apiSuccess(mockTasks, 'Tasks retrieved successfully', mockTasks.length)
          ),
        });
      }
      return route.continue();
    });

    // Mock GET /projects (used by some task subcomponents)
    await page.route('http://localhost:3003/api/projects*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiSuccess(mockProjects, 'Projects retrieved successfully', mockProjects.length)
        ),
      })
    );

    // Mock GET /calendar-events
    await page.route('http://localhost:3003/api/calendar-events*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess([], 'OK', 0)),
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

    await page.goto('/tasks');
  });

  test('shows the Task Manager heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();
  });

  test('displays the page subtitle', async ({ page }) => {
    await expect(
      page.getByText(/organize your tasks and boost your productivity/i)
    ).toBeVisible();
  });

  test('has a "Your Tasks" section heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /your tasks/i })
    ).toBeVisible();
  });

  test('shows a task creation button', async ({ page }) => {
    // The TaskCreateForm renders a button to open the creation dialog
    const createBtn = page
      .getByRole('button')
      .filter({ hasText: /new task|add task|create/i })
      .first();
    await expect(createBtn).toBeVisible();
  });
});
