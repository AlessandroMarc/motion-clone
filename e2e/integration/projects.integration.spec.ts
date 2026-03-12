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
    await expect(nameInput).toBeVisible();
    await nameInput.fill(projectName);

    const descInput = page.getByLabel(/description/i);
    await expect(descInput).toBeVisible();
    await descInput.fill('Automated integration test project');

    // ── Submit ──
    const submitBtn = page.getByRole('button', { name: /create project/i }).last();
    
    // Wait for submit button to be visible and enabled
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.scrollIntoViewIfNeeded();
    
    // Small delay to ensure form state is settled
    await page.waitForTimeout(200);

    // Set up response watcher BEFORE clicking submit
    // Watch for POST request to /api/projects endpoint
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'POST' &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 20000 }
    );

    // Click submit
    await submitBtn.click();

    // Wait for the API response
    await createResponsePromise;

    // Wait for the dialog to close
    await expect(
      page.getByRole('heading', { name: /create new project/i })
    ).not.toBeVisible({ timeout: 5000 });

    // Wait for the project list to refresh and show the new project
    // Use toPass for retry logic as the list may take time to update
    const projectLink = page.getByRole('link', { name: projectName });
    await expect(async () => {
      await expect(projectLink).toBeVisible();
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 4000, 8000] });

    // ── Delete the project ──
    // Find the project card by the link that contains the project name
    const projectCard = page.getByRole('link', { name: projectName }).locator('..').locator('..');
    const deleteButton = projectCard.getByRole('button', { name: /delete/i });

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
    } else {
      // Fallback: find the delete button by looking for any delete button
      // and checking if it's in a card with this project's name
      const allDeletes = page.getByRole('button', { name: /delete/i });
      for (let i = 0; i < (await allDeletes.count()); i++) {
        const deleteElem = allDeletes.nth(i);
        const parent = deleteElem.locator('..').locator('..').locator('..');
        const hasProjectName = await parent
          .getByText(projectName)
          .isVisible()
          .catch(() => false);
        if (hasProjectName) {
          await deleteElem.click();
          break;
        }
      }
    }

    // Wait for confirmation dialog
    await page.waitForTimeout(500);

    // Confirm deletion in the alert dialog
    const confirmBtn = page.getByRole('button', { name: /^delete$/i });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // ── Verify it's gone ──
    // The project link should no longer be visible
    await expect(projectLink).not.toBeVisible({ timeout: 30000 });
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
