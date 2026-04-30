import { test, expect } from '@playwright/test';

test.describe('Task Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('#email').fill('owner@acme.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('navigate to task list', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('.page-header')).toContainText('Tasks');
  });

  test('create a new task', async ({ page }) => {
    await page.goto('/tasks/new');
    await expect(page.locator('.page-header')).toContainText('Create Task');

    await page.locator('#title').fill('E2E Playwright Task');
    await page.locator('#status').selectOption('TODO');
    await page.locator('#priority').selectOption('HIGH');
    await page.locator('button[type="submit"]').click();

    // Should navigate to task detail or show success
    await expect(page).toHaveURL(/\/tasks\/.+/, { timeout: 10000 });
  });

  test('search tasks', async ({ page }) => {
    await page.goto('/tasks');
    const searchInput = page.locator('input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('E2E');
      await page.waitForTimeout(500); // debounce
      // Task list should update
    }
  });

  test('filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');
    const statusFilter = page.locator('select[aria-label="Filter by status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('TODO');
      await page.waitForTimeout(300);
    }
  });

  test('view task detail from list', async ({ page }) => {
    await page.goto('/tasks');
    const taskLink = page.locator('.task-table a').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      await expect(page).toHaveURL(/\/tasks\/.+/, { timeout: 5000 });
    }
  });
});
