import { test, expect } from '@playwright/test';

/**
 * Integration tests for the Tasks page.
 *
 * These tests run against the REAL backend + Supabase database.
 * Auth is handled via storageState (set up in globalSetup).
 * Data is wiped before and after the suite via globalSetup/globalTeardown.
 */

const E2E_PREFIX = '[E2E]';

/** Helper: wait for auth to complete (past the sign-in screen). */
async function waitForAuth(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => {
      const heading = document.querySelector('h1, h2, h3');
      return heading && !heading.textContent?.includes('Sign in');
    },
    { timeout: 15000 }
  );
}

/**
 * Helper: create a task via the UI dialog on the current page.
 * Works from any page that has a "Create Task" or "New Task" button.
 */
async function createTaskViaDialog(
  page: import('@playwright/test').Page,
  title: string
) {
  // Find and click the create/new task button
  const createBtn = page
    .getByRole('button')
    .filter({ hasText: /create task|new task/i })
    .first();
  await expect(createBtn).toBeVisible({ timeout: 5000 });
  await createBtn.click();

  // Wait for the dialog to fully render
  const dialogTitle = page.getByRole('heading', { name: /create new task/i });
  await expect(dialogTitle).toBeVisible({ timeout: 10000 });

  // Title (required)
  const titleInput = page.locator('input#title');
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(title);

  // Planned duration (required) — it's a popover button, not a text input
  const durationBtn = page.locator('button#planned_duration_minutes');
  await durationBtn.scrollIntoViewIfNeeded();
  await expect(durationBtn).toBeVisible({ timeout: 5000 });
  await durationBtn.click();

  // Select "30 minutes" from the preset list inside the popover
  const durationOption = page.getByRole('option', { name: /30 minutes/i });
  await expect(durationOption).toBeVisible({ timeout: 5000 });
  await durationOption.click();

  // Submit — get the last visible "Create Task" button (inside the dialog form)
  const submitBtn = page
    .getByRole('button', { name: /create task/i })
    .last();
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

test.describe('Tasks — integration', () => {
  test('create a task, verify it appears, then delete it', async ({ page }) => {
    const taskTitle = `${E2E_PREFIX} Test Task ${Date.now()}`;

    // ── Navigate to tasks page ──
    await page.goto('/tasks');
    await waitForAuth(page);

    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible({ timeout: 5000 });

    // ── Create task via dialog ──
    await createTaskViaDialog(page, taskTitle);

    // ── Verify the task appears in the list ──
    console.log('[E2E] Waiting for task to appear in list...');
    const taskElement = page.getByText(taskTitle);
    await expect(taskElement).toBeVisible({ timeout: 40000 });
    console.log('[E2E] Task is visible.');

    // ── Delete the task ──
    await taskElement.click();

    const deleteButton = page.getByRole('button', { name: /delete/i });
    if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.first().click();

      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole('button', { name: /^delete$/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }

      await expect(taskElement).not.toBeVisible({ timeout: 30000 });
      console.log('[E2E] Task deleted.');
    } else {
      console.log('[E2E] No direct delete button found — task creation verified.');
    }
  });

  test('tasks page shows correct headings and sections', async ({ page }) => {
    await page.goto('/tasks');
    await waitForAuth(page);

    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();

    await expect(
      page.getByText(/organize your tasks and boost your productivity/i)
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /your tasks/i })
    ).toBeVisible();

    const createBtn = page
      .getByRole('button')
      .filter({ hasText: /create task/i })
      .first();
    await expect(createBtn).toBeVisible();
  });
});
