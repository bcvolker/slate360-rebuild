import { test, expect } from "@playwright/test";

const WALK_TOKEN = process.env.MONDAY_WALK_TOKEN || "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const TWIN_JOB = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";

test.describe("monday spatial", () => {
  test("Walkthrough share is not the global error boundary", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    const res = await page.goto(`/w/${WALK_TOKEN}`, { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 401).toBeTruthy();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(page.getByText("The error has been reported.")).toHaveCount(0);
    const poster = page.locator("[data-testid='sw-poster-gate'] img, [data-testid='sw-pano'], .sw-frame").first();
    await expect(poster).toBeVisible({ timeout: 20_000 });
    const visible = await page.locator("[data-scene-visible='true']").count();
    const posterImg = page.locator("[data-testid='sw-poster-gate'] img").first();
    if (await posterImg.count()) {
      const w = await posterImg.evaluate((el) => (el as HTMLImageElement).naturalWidth);
      expect(w).toBeGreaterThan(16);
    }
    expect(visible + (await posterImg.count())).toBeGreaterThan(0);
    expect(pageErrors.join("\n")).not.toMatch(/Cannot read propert/i);
  });

  test("Twin preview is not a graphite-only viewport", async ({ page }) => {
    await page.goto(`/preview/twin-metric?job=${TWIN_JOB}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    const hero = page.locator("[data-testid='kitchen-poster'] img, [data-testid='kitchen-hero-fallback']").first();
    await expect(hero).toBeVisible({ timeout: 12_000 });
    await page.waitForTimeout(4_000);
    const shell = page.locator("[data-testid='twin-metric-root'] [data-visible-layer], .kv-shell").first();
    const layer = await shell.getAttribute("data-visible-layer");
    const sceneVisible = await page.locator("[data-scene-visible='true']").count();
    if (layer === "hero") {
      const img = page.locator("[data-testid='kitchen-poster'] img").first();
      const w = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth).catch(() => 0);
      expect(w).toBeGreaterThan(16);
    } else {
      expect(sceneVisible).toBeGreaterThan(0);
      expect(layer === "geometry" || layer === "reality").toBeTruthy();
    }
    await expect(page.locator("[data-testid='kitchen-layer-reality']")).toBeVisible();
    await expect(page.locator("[data-testid='kitchen-layer-geometry']")).toBeVisible();
  });

  test("artificial SPZ failure keeps the hero/geometry path", async ({ page }) => {
    await page.goto(`/preview/twin-metric?job=${TWIN_JOB}&fail=spz`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid='kitchen-poster'], [data-scene-visible='true']").first()).toBeVisible({
      timeout: 12_000,
    });
    await expect(page.getByText(/Geometry remains available|Reality is still loading|Kitchen/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });
});
