import { test, expect, type Page } from "@playwright/test";

/**
 * MAP-1 Location layer (roster slice #14) — Library Grid⇄Map toggle +
 * Analyze GPS mini-map (doc D2). Runs against /preview/thermal-v2, whose
 * only geotagged fixture is "a" (roof-nw-01.jpeg). See
 * thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 MAP-1 location layer", () => {
  test.use({ serviceWorkers: "block" });

  test("Library's Map toggle shows the located-count chip and a pin", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(page.getByText("1 of 6 have location")).toBeVisible();
    await expect(page.locator(".leaflet-interactive")).toHaveCount(1);
  });

  test("clicking a pin's popup 'Open in Analyze' switches to Analyze on that image", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.locator(".leaflet-interactive").click();
    await expect(page.getByText("roof-nw-01.jpeg")).toBeVisible();

    await page.getByRole("button", { name: "Open in Analyze" }).click();
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toHaveClass(/graphite-primary/);
  });

  test("clicking a pin's '+ Select' adds it to the Scope selection", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.locator(".leaflet-interactive").click();

    await expect(page.getByRole("radio", { name: "Selected (0)" })).toBeVisible();
    await page.getByRole("button", { name: "+ Select" }).click();
    await expect(page.getByRole("radio", { name: "Selected (1)" })).toBeVisible();
  });

  test("Grid is the default view and switching back from Map restores it", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await expect(page.locator('button[title*="double-click to analyze"]').first()).toBeVisible();
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(page.getByText("1 of 6 have location")).toBeVisible();
    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await expect(page.locator('button[title*="double-click to analyze"]').first()).toBeVisible();
  });

  test("Analyze's Notes & photo data shows an inline GPS mini-map only for a geotagged image", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("button", { name: /^Notes & photo data/ }).click();
    // Fixture "a" (default active) has GPS.
    await expect(page.getByText(/^33\.\d+, -111\.\d+ — open full map$/)).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible();

    // Fixture "b" has no GPS.
    await page.getByTitle("roof-nw-02.jpeg").click();
    await expect(page.getByText(/— open full map$/)).not.toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
  });
});
