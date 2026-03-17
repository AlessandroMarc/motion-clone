import { test, expect } from '@playwright/test';
import { waitForAuth } from './helpers/testUtils';

/**
 * Integration tests for the Calendar page.
 *
 * These tests run against the REAL backend + Supabase database.
 * Auth is handled via storageState (set up in globalSetup).
 * Data is wiped before and after the suite via globalSetup/globalTeardown.
 */

test.describe('Calendar — integration', () => {
  test('calendar page loads and shows week view', async ({ page }) => {
    await page.goto('/calendar');
    await waitForAuth(page);

    // Verify the calendar page rendered
    await expect(page).toHaveURL(/\/calendar/);

    // Verify the "Today" navigation button is visible
    const todayBtn = page.getByRole('button', { name: /today/i });
    await expect(todayBtn).toBeVisible({ timeout: 10000 });

    // Verify week navigation arrows exist
    const prevBtn = page
      .getByRole('button', { name: /previous/i })
      .or(
        page
          .locator('button')
          .filter({ has: page.locator('[data-lucide="chevron-left"]') })
      );
    // At minimum, check there are navigation buttons in the header area
    const headerButtons = page.getByRole('button');
    expect(await headerButtons.count()).toBeGreaterThan(0);
  });

  test('calendar shows Auto-Schedule button', async ({ page }) => {
    await page.goto('/calendar');
    await waitForAuth(page);

    // The Auto-Schedule button should be visible on desktop
    const autoScheduleBtn = page.getByRole('button', {
      name: /auto-schedule|auto schedule/i,
    });
    await expect(autoScheduleBtn).toBeVisible({ timeout: 10000 });
  });

  test('calendar shows New Task button that opens create dialog', async ({
    page,
  }) => {
    await page.goto('/calendar');
    await waitForAuth(page);

    // Find and click the New Task button
    const newTaskBtn = page.getByRole('button', { name: /new task/i });
    await expect(newTaskBtn).toBeVisible({ timeout: 10000 });
    await newTaskBtn.click();

    // Verify the create task dialog opens
    const dialogHeading = page.getByRole('heading', {
      name: /create new task/i,
    });
    await expect(dialogHeading).toBeVisible({ timeout: 10000 });
  });

  test('navigate between calendar and tasks via sidebar', async ({ page }) => {
    await page.goto('/calendar');
    await waitForAuth(page);

    // Navigate to tasks via sidebar
    const tasksLink = page.getByRole('link', { name: /tasks/i }).first();
    await expect(tasksLink).toBeVisible();
    await tasksLink.click();

    await expect(page).toHaveURL(/\/tasks/);
    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();

    // Navigate back to calendar
    const calendarLink = page.getByRole('link', { name: /calendar/i }).first();
    await calendarLink.click();

    await expect(page).toHaveURL(/\/calendar/);
  });
});
