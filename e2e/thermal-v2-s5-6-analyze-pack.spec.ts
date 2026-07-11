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

test.describe("Thermal V2 S5.6 Analyze completion pack — push 2 (alarms + sensitivity)", () => {
  test.use({ serviceWorkers: "block" });

  test("Enhance-here (⌖) recenters the span on the hovered temperature", async ({ page }) => {
    await openAnalyze(page);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    // Grid temp at x=0.5 is 20 + 50*0.2 = 30°C.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.getByTitle("Enhance here — center the display span on this temperature (E)").click();

    await page.getByRole("button", { name: /^Display/ }).click();
    const numberInputs = page.locator('input[type="number"]');
    const lo = Number(await numberInputs.nth(0).inputValue());
    const hi = Number(await numberInputs.nth(1).inputValue());
    expect(hi - lo).toBeCloseTo(4, 0);
  });

  test("alarm mode 'Above limit' dims out-of-band pixels, leaves in-band pixels in color", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByLabel(/Alarm mode/).selectOption("above");
    await page.getByLabel(/^Limit \(/).fill("27");
    await page.waitForTimeout(300);

    const [inBand, outOfBand] = await page.evaluate(() => {
      const canvas = document.querySelectorAll("canvas")[0] as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      // x=60 → 32°C (above the 27° limit); x=10 → 22°C (below it).
      const a = ctx.getImageData(60, 50, 1, 1).data;
      const b = ctx.getImageData(10, 50, 1, 1).data;
      return [
        [a[0], a[1], a[2]],
        [b[0], b[1], b[2]],
      ];
    });

    expect(Math.abs(inBand[0] - inBand[1]) + Math.abs(inBand[1] - inBand[2])).toBeGreaterThan(30);
    expect(outOfBand[0]).toBe(outOfBand[1]);
    expect(outOfBand[1]).toBe(outOfBand[2]);
  });

  test("dew point mode computes and displays a dew point value", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByLabel(/Alarm mode/).selectOption("dewpoint");
    await expect(page.getByText(/dew point \d/i)).toBeVisible();
  });

  test("severity bands color the Δ chip after choosing a preset", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "Point", exact: true }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5); // ~26°C
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5); // ~34°C, Δ~8°

    await expect(page.getByText("Point").first()).toBeVisible();
    await page.getByTitle("Set as reference").first().click();

    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByLabel(/Severity bands/).selectOption("Neutral defaults");

    await page.getByRole("button", { name: "Measurements" }).click();
    const deltaChip = page.locator("li").nth(1).locator("span.w-14");
    await expect(deltaChip).toHaveClass(/border-red-500/);
  });

  test("local contrast toggle doesn't change the hover readout (display only)", async ({ page }) => {
    await openAnalyze(page);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    const readout = page.getByText(/^\d+\.\d°F$/);
    await expect(readout).toBeVisible();
    const before = await readout.textContent();

    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByLabel("Local contrast (display only)").check();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);

    await expect(readout).toHaveText(before ?? "");
  });

  test("A/B flicker stores two snapshots and toggles which one is showing", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByRole("button", { name: "Store A" }).click();
    await page.getByTitle("Color palette").selectOption("Rainbow");
    await page.getByRole("button", { name: "Store B" }).click();

    await expect(page.getByRole("button", { name: "Showing A" })).toBeVisible();
    await page.getByRole("button", { name: "Showing A" }).click();
    await expect(page.getByRole("button", { name: "Showing B" })).toBeVisible();
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await openAnalyze(page);
    await page.getByRole("button", { name: /^Display/ }).click();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});

test.describe("Thermal V2 S5.6 Analyze completion pack — push 3 (rotate/flip + isotherm sweep)", () => {
  test.use({ serviceWorkers: "block" });

  test("Rotate 90° applies a CSS rotation to the canvas stage", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "More display settings" }).click();
    await page.getByRole("button", { name: "⟳ 90°" }).click();

    const transform = await page.evaluate(() => {
      const canvas = document.querySelectorAll("canvas")[0] as HTMLElement;
      return (canvas.parentElement as HTMLElement).style.transform;
    });
    expect(transform).toContain("rotate(90deg)");
  });

  test("rotating disables measurement creation and shows the view-only banner", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "More display settings" }).click();
    await page.getByRole("button", { name: "⟳ 90°" }).click();
    await page.mouse.click(5, 5); // close the ⋯ dropdown (stays open to allow repeated rotate/flip clicks)
    await expect(page.getByText("Rotated view — reset rotation to measure")).toBeVisible();

    await page.getByRole("button", { name: "Point", exact: true }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

    // Measurements is already open by default (never switched away in this test).
    await expect(page.getByText("No measurements yet")).toBeVisible();
  });

  test("Reset rotation restores the identity orientation and re-enables measuring", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: "More display settings" }).click();
    await page.getByRole("button", { name: "⟳ 90°" }).click();
    await page.getByRole("button", { name: "Reset rotation" }).click();
    await page.mouse.click(5, 5); // close the ⋯ dropdown
    await expect(page.getByText("Rotated view — reset rotation to measure")).not.toBeVisible();

    await page.getByRole("button", { name: "Point", exact: true }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

    await page.getByRole("button", { name: "Measurements" }).click();
    await expect(page.getByText("Point").first()).toBeVisible();
  });

  test("isotherm sweep slider live-updates the interval band", async ({ page }) => {
    await openAnalyze(page);
    await page.getByRole("button", { name: /^Display/ }).click();
    await page.getByLabel(/Alarm mode/).selectOption("interval");

    const sweep = page.getByLabel("Sweep");
    await sweep.fill("35");

    const numberInputs = page.locator('input[type="number"]');
    const lo = Number(await numberInputs.nth(2).inputValue());
    const hi = Number(await numberInputs.nth(3).inputValue());
    expect((lo + hi) / 2).toBeCloseTo(35, 0);
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
