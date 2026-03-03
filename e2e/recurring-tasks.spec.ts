import { test, expect } from '@playwright/test';
import { apiSuccess, mockTasks, mockProjects } from './fixtures/apiMocks';

test.describe('Recurring tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://localhost:3003/api/tasks*', route => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            apiSuccess(
              mockTasks,
              'Tasks retrieved successfully',
              mockTasks.length
            )
          ),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess({}, 'OK', 1)),
      });
    });

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

    await page.route('http://localhost:3003/api/calendar-events*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSuccess([], 'OK', 0)),
      })
    );

    await page.goto('/tasks');
  });

  test('shows recurrence controls when repeating is enabled', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /create task/i })
      .first()
      .click();

    await expect(page.getByText('Repeating Task')).toBeVisible();

    await page.getByRole('checkbox', { name: /repeating task/i }).click();

    await expect(page.getByRole('combobox', { name: /pattern/i })).toBeVisible();
    await expect(page.locator('input#recurrence_interval')).toBeVisible();
    await expect(
      page.getByText(/events will be generated up to 90 days ahead/i)
    ).toBeVisible();
  });

  test('hides recurrence controls when repeating is disabled', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /create task/i })
      .first()
      .click();

    const repeating = page.getByRole('checkbox', { name: /repeating task/i });
    await repeating.click();

    await expect(page.getByRole('combobox', { name: /pattern/i })).toBeVisible();

    await repeating.click();

    await expect(page.getByRole('combobox', { name: /pattern/i })).not.toBeVisible();
    await expect(page.locator('input#recurrence_interval')).not.toBeVisible();
  });
});
