import { test, expect, type Page } from "@playwright/test";

/**
 * S5.6 Analyze completion pack, push 1 — polygon tool, Δ-compare, line
 * profile (roster slice #8). Runs against /preview/thermal-v2. See
 * thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

/** Fake grid so useAnalyzeImage's `!grid` guard (which gates every autosave) clears. */
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

test.describe("Thermal V2 S5.6 Analyze completion pack — push 1", () => {
  test.use({ serviceWorkers: "block" });

  test("drawing a polygon (3 clicks + Enter) adds it to the Measurements list", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "Polygon" }).click();

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.7);
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: "Measurements" }).click();
    await expect(page.getByText("Polygon")).toBeVisible();
  });

  test("Δ-compare pins the delta between two measurements", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "Point", exact: true }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.7);

    await expect(page.getByText("Point").first()).toBeVisible();

    // The ⇄ button's accessible name is the icon glyph itself — the tooltip text
    // ("Compare to another measurement") is only a title, not the a11y name.
    const compareButtons = page.getByTitle("Compare to another measurement");
    await expect(compareButtons).toHaveCount(2);
    await compareButtons.nth(0).click();
    await page.getByTitle("Compare to another measurement").first().click();

    await expect(page.getByText(/#2 vs #1: Δ/)).toBeVisible();
  });

  test("selecting a line measurement shows its temperature profile chart", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "Line", exact: true }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

    await expect(page.getByText("Line profile — Line")).toBeVisible();
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
