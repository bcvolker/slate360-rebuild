import { test, expect } from '@playwright/test';

test('home has sections and updates hash via anchor', async ({ page }) => {
  await page.goto('/');
  // Ensure at least one tile section exists
  const sections = page.locator('section[id]');
  await expect(sections.first()).toBeVisible();
  // Click first menu item if present
  const menuBtn = page.locator('header button:has-text("Menu")');
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
  }
  const firstMenuLink = page.locator('header nav a[href^="/#"]');
  if (await firstMenuLink.first().isVisible()) {
    await firstMenuLink.first().click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#');
  }
});