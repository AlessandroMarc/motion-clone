import { test, expect } from '@playwright/test';
import { waitForAuth } from './helpers/testUtils';

/**
 * Integration tests for sidebar navigation between pages.
 *
 * These tests run against the REAL backend + Supabase database.
 * Auth is handled via storageState (set up in globalSetup).
 */

test.describe('Navigation — integration', () => {
  test('navigate through all main pages via sidebar', async ({ page }) => {
    // Start on tasks page
    await page.goto('/tasks');
    await waitForAuth(page);
    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();

    // Navigate to projects
    const projectsLink = page.getByRole('link', { name: /projects/i }).first();
    await projectsLink.click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(
      page.getByRole('heading', { name: /project manager/i })
    ).toBeVisible();

    // Navigate to calendar
    const calendarLink = page.getByRole('link', { name: /calendar/i }).first();
    await calendarLink.click();
    await expect(page).toHaveURL(/\/calendar/);

    // Navigate back to tasks
    const tasksLink = page.getByRole('link', { name: /tasks/i }).first();
    await tasksLink.click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();
  });

  test('authenticated API calls succeed (health check)', async ({ page }) => {
    // This test verifies the core issue: that authenticated API calls
    // don't fail with 401 due to missing SUPABASE_JWT_SECRET
    await page.goto('/tasks');
    await waitForAuth(page);

    // Wait for the tasks API call to complete successfully
    // If SUPABASE_JWT_SECRET is missing, this would return 401
    const response = await page.waitForResponse(
      response =>
        response.url().includes('/api/tasks') &&
        response.request().method() === 'GET',
      { timeout: 15000 }
    );

    // The key assertion: authenticated API calls should not return 401
    expect(response.status()).not.toBe(401);
    console.log(`[E2E] Tasks API returned status ${response.status()}`);
  });
});
