import { test, expect, type Page } from "@playwright/test";

/**
 * S6.5 Compare + fusion, push 1 — synced-pan Compare view (roster slice
 * #10). Runs against /preview/thermal-v2. See
 * thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
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

test.describe("Thermal V2 S6.5 Compare view", () => {
  test.use({ serviceWorkers: "block" });

  test("Compare is disabled until exactly 2 images are selected", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "⧉⧉ Compare" })).toBeDisabled();
  });

  test("selecting 2 images enables Compare; toggling it renders two synced-pan canvases", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);

    // Select exactly 2 thumbnails (ctrl/meta-click toggles a 2nd into selection).
    const thumbs = page.locator('button[title*="double-click to analyze"]');
    await thumbs.nth(0).click();
    await thumbs.nth(1).click({ modifiers: ["Control"] });

    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    const compareButton = page.getByRole("button", { name: "⧉⧉ Compare" });
    await expect(compareButton).toBeEnabled();
    await compareButton.click();

    const compareView = page.getByTestId("analyze-compare-view");
    await expect(compareView).toBeVisible();
    await expect(compareView.locator("canvas")).toHaveCount(2);
  });

  test("span-lock checkbox only appears while Compare is active", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);
    const thumbs = page.locator('button[title*="double-click to analyze"]');
    await thumbs.nth(0).click();
    await thumbs.nth(1).click({ modifiers: ["Control"] });
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    await expect(page.getByText("Lock span across both")).not.toBeVisible();
    await page.getByRole("button", { name: "⧉⧉ Compare" }).click();
    await expect(page.getByText("Lock span across both")).toBeVisible();
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockGrid(page);
    await warmBuildIdThenGoto(page);
    const thumbs = page.locator('button[title*="double-click to analyze"]');
    await thumbs.nth(0).click();
    await thumbs.nth(1).click({ modifiers: ["Control"] });
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("button", { name: "⧉⧉ Compare" }).click();
    await expect(page.getByTestId("analyze-compare-view")).toBeVisible();

    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
