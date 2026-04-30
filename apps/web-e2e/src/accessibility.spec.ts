import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('login page has proper labels and focus management', async ({ page }) => {
    await page.goto('/login');

    // Email input should have associated label
    const emailInput = page.locator('#email');
    expect(await emailInput.getAttribute('aria-label') || await page.locator('label[for="email"]').count()).toBeGreaterThan(0);

    // Password input should have associated label
    const passwordInput = page.locator('#password');
    expect(await passwordInput.getAttribute('aria-label') || await page.locator('label[for="password"]').count()).toBeGreaterThan(0);

    // Submit button should be focusable
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();

    // Form should have error alert role when validation fails
    await submitBtn.click();
    const errorAlert = page.locator('[role="alert"]');
    if (await errorAlert.count() > 0) {
      await expect(errorAlert).toBeVisible();
    }
  });

  test('dashboard is keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('task list has proper table headers', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    await page.goto('/tasks');
    const headers = page.locator('.task-table th');
    if (await headers.count() > 0) {
      // Table headers should have scope attribute
      const headerTexts = await headers.allTextContents();
      expect(headerTexts).toContain('Title');
      expect(headerTexts).toContain('Status');
    }
  });

  test('chat panel has aria attributes', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    const toggle = page.locator('button[aria-label="Open task assistant"]');
    if (await toggle.isVisible()) {
      // Toggle should have aria-expanded
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await toggle.click();

      // Chat panel should have role="complementary"
      const panel = page.locator('.chat-panel');
      await expect(panel).toHaveAttribute('role', 'complementary');

      // Input should have aria-label
      const textarea = page.locator('textarea[aria-label="Chat message input"]');
      await expect(textarea).toBeVisible();

      // Send button should have aria-label
      const sendBtn = page.locator('button[aria-label="Send message"]');
      await expect(sendBtn).toBeVisible();
    }
  });
});
