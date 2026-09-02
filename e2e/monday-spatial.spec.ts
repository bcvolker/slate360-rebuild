import { test, expect } from "@playwright/test";

const WALK_TOKEN = process.env.MONDAY_WALK_TOKEN || "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const TWIN_JOB = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";

test.describe("monday spatial", () => {
  test("Walkthrough share paints graphite and a poster, not a white page", async ({ page }) => {
    const res = await page.goto(`/w/${WALK_TOKEN}`, { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 401).toBeTruthy();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgb(255, 255, 255)");
    const stage = page.locator(".sw-frame, [data-testid='sw-pano']").first();
    await expect(stage).toBeVisible({ timeout: 20_000 });
  });

  test("Twin preview shows a spatial hero before Geometry", async ({ page }) => {
    await page.goto(`/preview/twin-metric?job=${TWIN_JOB}`, { waitUntil: "domcontentloaded" });
    const hero = page.locator("[data-testid='kitchen-poster'] img, [data-testid='kitchen-hero-fallback']").first();
    await expect(hero).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("[data-testid='kitchen-layer-reality']")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("[data-testid='kitchen-layer-geometry']")).toBeVisible();
  });

  test("artificial SPZ failure keeps the hero/geometry path", async ({ page }) => {
    await page.goto(`/preview/twin-metric?job=${TWIN_JOB}&fail=spz`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid='kitchen-poster']")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Geometry remains available|Reality is still loading|Kitchen/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
