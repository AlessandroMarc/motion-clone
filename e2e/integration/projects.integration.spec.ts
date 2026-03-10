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
    await page.goto('/projects');

    // Wait for the AuthContext to load the session from storageState
    // The session should be in localStorage and cookies from globalSetup
    await page.waitForFunction(
      () => {
        // Check if authentication is complete by looking for content beyond the login screen
        const heading = document.querySelector('h1, h2, h3');
        return heading && !heading.textContent?.includes('Sign in');
      },
      { timeout: 15000 }
    );

    // Now wait for the specific projects heading to be visible
    await expect(
      page.getByRole('heading', { name: /project manager/i })
    ).toBeVisible({ timeout: 5000 });

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

    // Wait for the API to process and the page to update
    await page.waitForTimeout(1000);

    // ── Verify the project appears in the list ──
    // CI environments may be slower, so use a longer timeout
    // Also wait for the page to be stable before checking
    try {
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 30_000 });
    } catch (error) {
      // Log page content for debugging
      const content = await page.content();
      if (content.includes('error') || content.includes('Error')) {
        console.error('[test] Page contains error message');
      }
      throw error;
    }

    // ── Delete the project ──
    // Find the Delete link for this project
    // The project name is displayed in an h3, and Delete link is nearby
    const projectHeading = page.locator('h3', { hasText: projectName });
    const projectCard = projectHeading.locator('..');
    const deleteLink = projectCard.getByRole('link', { name: 'Delete' });

    if (await deleteLink.isVisible().catch(() => false)) {
      await deleteLink.click();

      // Wait for confirmation dialog
      await page.waitForTimeout(500);

      // Confirm deletion in the alert dialog
      const confirmBtn = page.getByRole('button', { name: /^delete$/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    } else {
      // Fallback: just look for any Delete element containing this project's text
      const allDeletes = page.getByText('Delete');
      for (let i = 0; i < (await allDeletes.count()); i++) {
        const deleteElem = allDeletes.nth(i);
        const parent = deleteElem.locator('..');
        const hasProjectName = await parent.getByText(projectName).isVisible().catch(() => false);
        if (hasProjectName) {
          await deleteElem.click();
          await page.waitForTimeout(500);
          const confirmBtn = page.getByRole('button', { name: /^delete$/i });
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
          }
          break;
        }
      }
    }

    // ── Verify it's gone ──
    // CI environments may be slower, so use a longer timeout
    await expect(page.getByText(projectName)).not.toBeVisible({
      timeout: 30_000,
    });
  });

  test('navigate to tasks page from sidebar', async ({ page }) => {
    await page.goto('/projects');

    // Wait for the AuthContext to load the session from storageState
    await page.waitForFunction(
      () => {
        const heading = document.querySelector('h1, h2, h3');
        return heading && !heading.textContent?.includes('Sign in');
      },
      { timeout: 15000 }
    );

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
