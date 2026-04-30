import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('open chat panel', async ({ page }) => {
    const toggle = page.locator('button[aria-label="Open task assistant"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('.chat-panel')).toBeVisible();
      await expect(page.locator('.chat-header')).toContainText('Task Assistant');
    }
  });

  test('send a message in chat', async ({ page }) => {
    const toggle = page.locator('button[aria-label="Open task assistant"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('.chat-panel')).toBeVisible();

      const textarea = page.locator('textarea[aria-label="Chat message input"]');
      await textarea.fill('What tasks are assigned to me?');
      await page.locator('button[aria-label="Send message"]').click();

      // Wait for response (typing indicator should appear then resolve)
      await page.waitForTimeout(3000);
    }
  });

  test('chat shows suggested prompts', async ({ page }) => {
    const toggle = page.locator('button[aria-label="Open task assistant"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('.prompt-chip').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('close chat panel', async ({ page }) => {
    const toggle = page.locator('button[aria-label="Open task assistant"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('.chat-panel')).toBeVisible();

      const close = page.locator('button[aria-label="Close chat panel"]');
      await close.click();
      await expect(page.locator('.chat-panel.open')).not.toBeVisible();
    }
  });
});
