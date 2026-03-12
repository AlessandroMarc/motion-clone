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

    // Wait for the backend to be healthy before proceeding
    // This ensures the backend server is ready to accept requests
    try {
      const healthResponse = await page.request.get(
        'http://localhost:3003/api/health'
      );
      if (!healthResponse.ok()) {
        console.warn(
          '[test] Backend health check failed:',
          healthResponse.status()
        );
      } else {
        console.log('[test] Backend health check passed');
      }
    } catch (error) {
      console.warn('[test] Backend health check error:', error);
    }

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

    // Small delay to ensure form state is fully settled before submit
    await page.waitForTimeout(300);

    // ── Submit ──
    const submitBtn = page
      .getByRole('button', { name: /create project/i })
      .last();

    // Set up request/response monitoring for debugging
    page.on('request', request => {
      if (request.url().includes('/api/projects') && request.method() === 'POST') {
        console.log('[test] POST request detected:', request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/projects') && response.request().method() === 'POST') {
        console.log('[test] POST response received:', response.status(), response.url());
      }
    });

    // Set up response watcher BEFORE clicking submit
    // Watch for POST request to /api/projects endpoint
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'POST' &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 15000 }
    );

    await submitBtn.click();

    // Wait for the API response
    // Note: Backend returns 201 Created for successful project creation
    let createJson: any = null;
    try {
      const createResponse = await createResponsePromise;
      createJson = await createResponse.json().catch(() => null);
      if (createJson) {
        console.log('[test] Project created:', createJson);
      }
    } catch (error) {
      // If response watcher times out, wait for dialog to close as fallback
      console.warn(
        '[test] Response watcher timed out, waiting for dialog to close as fallback'
      );
    }

    // Wait for the dialog to close (works even if response watcher missed it)
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
