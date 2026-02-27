import { test, expect } from '@playwright/test';

/**
 * Auth flow E2E tests.
 *
 * These tests verify the auth gate and landing page behaviour.
 * No backend is needed — route interception handles all API calls.
 */

test.describe('Landing page', () => {
  test('shows the Nexto landing page at /', async ({ page }) => {
    await page.goto('/');
    // The landing page contains the product name
    await expect(page.locator('body')).toContainText('Nexto');
  });

  test('has a call-to-action button on the hero section', async ({ page }) => {
    await page.goto('/');
    // Hero section should have at least one prominent action button/link
    const ctaButton = page
      .locator('a, button')
      .filter({ hasText: /get started|sign in|try|start/i })
      .first();
    await expect(ctaButton).toBeVisible();
  });
});

test.describe('Protected routes with auth bypass', () => {
  // With NEXT_PUBLIC_AUTH_BYPASS=1 set in webServer env, ProtectedRoute
  // renders children directly without checking auth state.
  test('calendar page is accessible with auth bypass', async ({ page }) => {
    // Intercept all backend API calls
    await page.route('http://localhost:3003/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      })
    );

    await page.goto('/calendar');
    // Should NOT show the login dialog when auth bypass is active
    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).not.toBeVisible();
  });

  test('tasks page is accessible with auth bypass', async ({ page }) => {
    await page.route('http://localhost:3003/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      })
    );

    await page.goto('/tasks');
    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).not.toBeVisible();
  });

  test('projects page is accessible with auth bypass', async ({ page }) => {
    await page.route('http://localhost:3003/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      })
    );

    await page.goto('/projects');
    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).not.toBeVisible();
  });
});
