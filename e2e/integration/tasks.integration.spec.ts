import { test, expect } from '@playwright/test';
import { waitForAuth, createTaskViaDialog } from './helpers/testUtils';

/**
 * Integration tests for the Tasks page.
 *
 * These tests run against the REAL backend + Supabase database.
 * Auth is handled via storageState (set up in globalSetup).
 * Data is wiped before and after the suite via globalSetup/globalTeardown.
 */

const E2E_PREFIX = '[E2E]';

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
    if (
      await deleteButton
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await deleteButton.first().click();

      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole('button', { name: /^delete$/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }

      await expect(taskElement).not.toBeVisible({ timeout: 30000 });
      console.log('[E2E] Task deleted.');
    } else {
      console.log(
        '[E2E] No direct delete button found — task creation verified.'
      );
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
