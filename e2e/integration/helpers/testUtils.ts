import { expect, type Page } from '@playwright/test';

/**
 * Shared test helpers for integration tests.
 *
 * These helpers interact with the REAL UI + backend + Supabase.
 */

/** Wait for auth to complete (past the sign-in screen). */
export async function waitForAuth(page: Page) {
  await page.waitForFunction(
    () => {
      const heading = document.querySelector('h1, h2, h3');
      return heading && !heading.textContent?.includes('Sign in');
    },
    { timeout: 15000 }
  );
}

/**
 * Create a task via the UI dialog.
 * Works from any page that has a "Create Task" or "New Task" button.
 * Waits for the backend POST /api/tasks to succeed and the dialog to close.
 */
export async function createTaskViaDialog(page: Page, title: string) {
  // Wait for the page to settle (tasks list / calendar events may still be loading)
  await page.waitForLoadState('networkidle');

  // Find and click the create/new task button
  const createBtn = page
    .getByRole('button')
    .filter({ hasText: /create task|new task/i })
    .first();
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  await createBtn.click();

  // Wait for the dialog to fully render (DialogTitle is an h2)
  const dialogTitle = page.getByRole('heading', { name: /create new task/i });
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // Title (required)
  const titleInput = page.locator('input#title');
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(title);

  // Planned duration (required)
  // DurationInput renders a <Button> with a popover, not a text <input>.
  const durationBtn = page.locator('button#planned_duration_minutes');
  await durationBtn.scrollIntoViewIfNeeded();
  await expect(durationBtn).toBeVisible({ timeout: 5000 });
  await durationBtn.click();

  // Select "30 minutes" from the cmdk preset list (role="option")
  const durationOption = page.getByRole('option', { name: /30 minutes/i });
  await expect(durationOption).toBeVisible({ timeout: 5000 });
  await durationOption.click();

  // Submit — the last visible "Create Task" button is inside the dialog form
  const submitBtn = page.getByRole('button', { name: /create task/i }).last();
  await submitBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Watch for successful API response
  const createResponse = page.waitForResponse(
    r =>
      r.url().includes('/api/tasks') &&
      r.request().method() === 'POST' &&
      r.status() >= 200 &&
      r.status() < 300,
    { timeout: 30000 }
  );

  console.log('[E2E] Clicking create task submit...');
  await submitBtn.click();

  console.log('[E2E] Waiting for API response...');
  await createResponse;
  console.log('[E2E] Task created via API.');

  // Wait for dialog to close
  await expect(dialogTitle).not.toBeVisible({ timeout: 15000 });
  console.log('[E2E] Dialog closed.');
}
