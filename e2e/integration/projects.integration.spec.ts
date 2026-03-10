import { test, expect } from '@playwright/test';

/**
 * Integration tests for the Projects page.
 *
 * These tests run against the REAL backend + Supabase database.
 * Auth is handled via storageState (set up in globalSetup).
 * Data is wiped before and after the suite via globalSetup/globalTeardown.
 */

const E2E_PREFIX = '[E2E]';

test.describe('Projects — integration', () => {
  test('create a project, verify it appears, then delete it', async ({
    page,
  }) => {
    const projectName = `${E2E_PREFIX} Test Project ${Date.now()}`;

    // ── Navigate to projects page ──
    // NOTE: Integration test session handling still needs refinement.
    // The Supabase session from globalSetup should be available via storageState,
    // but the app's AuthContext may not be recognizing it yet.
    // TODO: Investigate @supabase/ssr session restoration behavior
    await page.goto('/projects');
    await expect(
      page.getByRole('heading', { name: /project manager/i })
    ).toBeVisible({ timeout: 15_000 });

    // ── Open the create dialog ──
    const createBtn = page.getByRole('button', { name: /create project/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // ── Fill the form ──
    await expect(
      page.getByRole('heading', { name: /create new project/i })
    ).toBeVisible();

    const nameInput = page.getByLabel(/project name/i);
    await nameInput.fill(projectName);

    const descInput = page.getByLabel(/description/i);
    await descInput.fill('Automated integration test project');

    // ── Submit ──
    const submitBtn = page
      .getByRole('button', { name: /create project/i })
      .last();
    await submitBtn.click();

    // ── Verify the project appears in the list ──
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });

    // ── Delete the project ──
    // Open the project's context menu / delete action
    // Look for a delete button associated with this project.
    // The ProjectItem likely has a dropdown or delete icon.
    const projectRow = page.locator(`text=${projectName}`).locator('..');
    const deleteBtn = projectRow
      .getByRole('button')
      .filter({ hasText: /delete/i });

    // If there's a dropdown menu trigger (three dots / ellipsis), click it first
    const menuTrigger = projectRow.locator(
      'button[aria-haspopup], [data-testid="project-menu"]'
    );
    if (await menuTrigger.isVisible().catch(() => false)) {
      await menuTrigger.click();
      await page.getByRole('menuitem', { name: /delete/i }).click();
    } else if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }

    // Confirm deletion in the alert dialog
    const confirmBtn = page.getByRole('button', { name: /^delete$/i });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // ── Verify it's gone ──
    await expect(page.getByText(projectName)).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test('navigate to tasks page from sidebar', async ({ page }) => {
    await page.goto('/projects');
    await expect(
      page.getByRole('heading', { name: /project manager/i })
    ).toBeVisible();

    // Navigate via sidebar link
    const tasksLink = page.getByRole('link', { name: /tasks/i }).first();
    await tasksLink.click();

    await expect(page).toHaveURL(/\/tasks/);
    await expect(
      page.getByRole('heading', { name: /task manager/i })
    ).toBeVisible();
  });
});
