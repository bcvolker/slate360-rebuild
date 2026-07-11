import { test, expect, type Page } from "@playwright/test";

/**
 * W2 (View original, Focus mode, Library status filters) + CAM-1 (honest
 * decode-state badges, supported-cameras line) — roster slice #9. Runs
 * against /preview/thermal-v2. See thermal-v2-r1-reliability.spec.ts for
 * warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page, query = "") {
  const target = `${URL}${query}`;
  await page.goto(target);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(target);
}

async function mockGrid(page: Page) {
  await page.route("**/api/ops/thermal/captures/*/grid", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ width: 100, height: 100, temps: Array.from({ length: 10000 }, (_, i) => 20 + (i % 100) * 0.2), minC: 20, maxC: 40, emissivity: 0.95 }),
    }),
  );
  await page.route("**/api/ops/thermal/captures/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
  });
}

async function openAnalyze(page: Page) {
  await mockGrid(page);
  await warmBuildIdThenGoto(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page.locator("canvas").first()).toBeVisible();
}

async function samplePixel(page: Page, x: number, y: number) {
  return page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelectorAll("canvas")[0] as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const d = ctx.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    },
    { x, y },
  );
}

test.describe("Thermal V2 W2 — View original, Focus mode, Library status filters", () => {
  test.use({ serviceWorkers: "block" });

  test("Library status filter chips show correct counts and filter the grid", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);

    // Fixture: 3 of 5 captures have no `anomalies` field (never AI-analyzed).
    const chip = page.getByText("Not AI-analyzed (3)");
    await expect(chip).toBeVisible();
    await chip.click();

    const thumbs = page.locator('button[title*="double-click to analyze"]');
    await expect(thumbs).toHaveCount(3);
  });

  test("display-only camera badge is distinct from the not-yet-decoded badge", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);

    const displayOnlyBadge = page.getByTitle("No temperature data — display only");
    await expect(displayOnlyBadge).toHaveCount(1);
    await expect(displayOnlyBadge).toHaveText("◐");

    const radiometricBadges = page.getByTitle("Radiometric — every pixel has a real temperature");
    await expect(radiometricBadges).toHaveCount(4);
  });

  test("empty Library shows the supported-cameras line", async ({ page }) => {
    await warmBuildIdThenGoto(page, "?empty=1");
    await expect(page.getByText(/Supported cameras:/)).toBeVisible();
  });

  test("View original (hold) resets the palette to camera default; releasing restores it", async ({ page }) => {
    await openAnalyze(page);
    await page.getByTitle("Color palette").selectOption("Rainbow");
    await page.waitForTimeout(200);
    const rainbowPixel = await samplePixel(page, 50, 50);

    const eyeButton = page.getByTitle(/Hold to view the original camera image/);
    await expect(eyeButton).toHaveAttribute("aria-pressed", "false");
    const box = await eyeButton.boundingBox();
    if (!box) throw new Error("eye button not laid out");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(eyeButton).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(200);
    const originalPixel = await samplePixel(page, 50, 50);
    expect(originalPixel).not.toEqual(rainbowPixel);

    await page.mouse.up();
    await expect(eyeButton).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(200);
    const restoredPixel = await samplePixel(page, 50, 50);
    expect(restoredPixel).toEqual(rainbowPixel);
  });

  test("Focus mode (F) collapses the details rail and filmstrip; Escape restores", async ({ page }) => {
    await openAnalyze(page);
    await expect(page.getByRole("button", { name: /^Display/ })).toBeVisible();

    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: /^Display/ })).not.toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /^Display/ })).toBeVisible();
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await openAnalyze(page);
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
