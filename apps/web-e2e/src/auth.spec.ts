import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    await expect(page.locator('.page-header')).toContainText('Welcome,');
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toContainText('Invalid email or password');
    await expect(page).toHaveURL('/login');
  });

  test('logout redirects to login page', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[role="menuitem"]', { hasText: 'Sign Out' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
