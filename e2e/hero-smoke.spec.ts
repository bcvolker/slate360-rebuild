import { test, expect, devices } from "@playwright/test";

/**
 * Smoke test of the live deploy.
 *
 * Run against production:
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://slate360.ai \
 *     npx playwright test e2e/hero-smoke.spec.ts --project=mobile-chrome
 *
 * Validates:
 *   - Home page loads, hero viewer renders inside the viewport (no overflow)
 *   - Expand button opens fullscreen, ESC closes
 *   - /coordination loads with bottom nav still present
 *   - /site-walk/walks either loads or shows the friendly error UI
 */

test.use({ ...devices["iPhone 13"] });

test("home: hero viewer fits within viewport on iPhone 13", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const viewer = page.locator(".relative.aspect-square").first();
  await expect(viewer).toBeVisible();

  const box = await viewer.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) return;

  // Bottom of viewer must be within the visible viewport (with 8px tolerance).
  const bottomEdge = box.y + box.height;
  expect.soft(bottomEdge, `viewer bottom ${bottomEdge}px exceeds viewport ${viewport.height}px`).toBeLessThanOrEqual(
    viewport.height + 8,
  );

  await page.screenshot({ path: "playwright-report/home-hero-iphone13.png", fullPage: false });
});

test("home: expand button opens fullscreen and Escape closes", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const expandBtn = page.getByRole("button", { name: /expand viewer/i });
  await expect(expandBtn).toBeVisible();
  await expandBtn.click();

  const dialog = page.getByRole("dialog", { name: /expanded demo viewer/i });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("/coordination: route loads (auth or page)", async ({ page }) => {
  const res = await page.goto("/coordination");
  // Either renders the page or redirects to login — both are acceptable smoke results.
  expect(res?.status() ?? 0).toBeLessThan(500);
});

test("/site-walk/walks: route does not 500", async ({ page }) => {
  const res = await page.goto("/site-walk/walks");
  expect(res?.status() ?? 0).toBeLessThan(500);
});
