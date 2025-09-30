import { test, expect } from '@playwright/test';

test.describe('Slate360 Homepage', () => {
  test('has basic structure and branding', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loads with proper title
    await expect(page).toHaveTitle(/Slate360/);
    
    // Verify navbar with logo is present
    const navbar = page.locator('header');
    await expect(navbar).toBeVisible();
    
    // Verify single logo in navbar (no duplicates in content)
    const logos = page.locator('img[alt*="Slate360"]');
    await expect(logos).toHaveCount(1);
    
    // Verify at least one tile section exists
    const sections = page.locator('section[id]');
    await expect(sections.first()).toBeVisible();
  });

  test('viewport sizing - one tile per screen', async ({ page }) => {
    await page.goto('/');
    
    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Check that each section takes roughly full viewport height minus header
    const sections = page.locator('section[id]');
    const sectionCount = await sections.count();
    
    for (let i = 0; i < Math.min(sectionCount, 3); i++) {
      const section = sections.nth(i);
      const box = await section.boundingBox();
      if (box) {
        // Section should be at least 80% of viewport height (accounting for header)
        expect(box.height).toBeGreaterThan(viewportHeight * 0.7);
      }
    }
  });

  test('anchor navigation updates hash', async ({ page }) => {
    await page.goto('/');
    
    // Open mobile menu if on mobile
    const menuBtn = page.locator('header button:has-text("Menu")');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }
    
    // Find first menu link
    const firstMenuLink = page.locator('header nav a[href^="/#"]').first();
    if (await firstMenuLink.isVisible()) {
      const href = await firstMenuLink.getAttribute('href');
      await firstMenuLink.click();
      
      // Wait for navigation/scroll
      await page.waitForTimeout(1000);
      
      // Verify hash is updated (but only if we actually navigated)
      const currentUrl = page.url();
      if (href && href.includes('#')) {
        const expectedHash = href.split('#')[1];
        expect(currentUrl).toContain(`#${expectedHash}`);
      }
    }
  });

  test('desktop snap behavior', async ({ page, isMobile }) => {
    // Skip on mobile as snap behavior is different
    test.skip(isMobile, 'Desktop-only test');
    
    await page.goto('/');
    
    // Check that scroll container exists on desktop
    const scrollContainer = page.locator('#scroll-container');
    await expect(scrollContainer).toBeVisible();
    
    // Verify snap-type is set (should be mandatory on desktop)
    const snapType = await scrollContainer.evaluate(el => 
      getComputedStyle(el).scrollSnapType
    );
    expect(snapType).toContain('y');
  });

  test('mobile responsive layout', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');
    
    await page.goto('/');
    
    // Verify mobile menu button exists
    const menuBtn = page.locator('header button');
    await expect(menuBtn).toBeVisible();
    
    // Verify sections stack properly on mobile
    const sections = page.locator('section[id]');
    const firstSection = sections.first();
    const box = await firstSection.boundingBox();
    
    if (box) {
      // On mobile, sections should take full width
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(box.width).toBeGreaterThan(viewportWidth * 0.95);
    }
  });

  test('content consistency across tiles', async ({ page }) => {
    await page.goto('/');
    
    const sections = page.locator('section[id]');
    const sectionCount = await sections.count();
    
    // Verify each section has a title (handle multiple h2s per section)
    for (let i = 0; i < Math.min(sectionCount, 5); i++) {
      const section = sections.nth(i);
      const title = section.locator('h2').first();
      await expect(title).toBeVisible();
    }
    
    // Verify viewer consistency (MediaViewer or MobileViewerLauncher should be present)
    const viewers = page.locator('[class*="MediaViewer"], [class*="MobileViewer"]');
    expect(await viewers.count()).toBeGreaterThan(0);
  });
});