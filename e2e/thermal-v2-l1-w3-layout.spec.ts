import { test, expect, type Page } from "@playwright/test";

/**
 * L1+W3 layout restructure + polish (Addendum D3/C1, roster slice #2).
 * Runs against /preview/thermal-v2. See thermal-v2-r1-reliability.spec.ts for
 * why warmBuildIdThenGoto exists (SWRegistrar's one-time build-id reload).
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 L1+W3 layout", () => {
  test.use({ serviceWorkers: "block" });

  test("Analyze has no duplicate 'Working set' strip — only the bottom filmstrip", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Working set")).toHaveCount(0);
    // The bottom dock is compact (no text header, just a collapse toggle) — see DockPanel.
    await expect(page.getByTitle("Hide Filmstrip")).toBeVisible();
  });

  test("the viewer is at least 60% of the Analyze width at 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze" }).click();
    const viewer = page.getByTestId("v2-viewer-panel");
    await expect(viewer).toBeVisible();
    const box = await viewer.boundingBox();
    expect(box).not.toBeNull();
    const fraction = (box!.width) / 1440;
    expect(fraction, `viewer width fraction was ${fraction}`).toBeGreaterThanOrEqual(0.6);
  });

  test("accordions are single-open — opening Tuning closes Measurements", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze" }).click();

    const measurementsHeader = page.getByRole("button", { name: "Measurements" });
    const tuningHeader = page.getByRole("button", { name: "Tuning" });
    await expect(measurementsHeader).toHaveAttribute("aria-expanded", "true");

    await tuningHeader.click();
    await expect(tuningHeader).toHaveAttribute("aria-expanded", "true");
    await expect(measurementsHeader).toHaveAttribute("aria-expanded", "false");
  });

  test("°C/°F moved into the ⋯ overflow menu", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze" }).click();

    // Not visible as a bare toolbar pill until the ⋯ menu opens.
    await expect(page.getByRole("button", { name: "°F", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "More display settings" }).click();
    await expect(page.getByRole("button", { name: "°F", exact: true })).toBeVisible();
  });

  test("Scope ✕ and Esc both clear a non-default scope back to This image", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("radio", { name: /^All/ }).click();
    await expect(page.getByRole("radio", { name: "This image" })).toHaveAttribute("aria-checked", "false");

    await page.getByRole("button", { name: "Clear scope" }).click();
    await expect(page.getByRole("radio", { name: "This image" })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("radio", { name: /^All/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("radio", { name: "This image" })).toHaveAttribute("aria-checked", "true");
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze" }).click();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
