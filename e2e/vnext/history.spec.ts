import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-7";
const LIST = "/preview/vnext/project/history";
const VISIT = "/preview/vnext/project/history/session-sep18";
const ALIGNED = "/preview/vnext/project/history/compare?a=capture-sep1&b=capture-sep15&rep=reality";
const INDEPENDENT = "/preview/vnext/project/history/compare?a=capture-sep1&b=capture-sep15-open&rep=reality";
const PANO = "/preview/vnext/project/history/compare?a=session-aug&b=session-sep18&rep=360";
const THERMAL = "/preview/vnext/project/history/compare?a=thermal-aug&b=thermal-sep18&rep=thermal";
const EMPTY = "/preview/vnext/project/history-empty";

test.describe("vNext history", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`history list at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(LIST, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
      await expect(page.getByText("Sep 18, 2026")).toHaveCount(2);
      await expect(page.getByText("Site documentation").first()).toBeVisible();
      await expect(page.getByText("Reality scan").first()).toBeVisible();
      await expect(page.getByText("No visits recorded yet.")).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/history-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("selected visit keeps its date and opens that source", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Level 2 walk/ }).click();
    await expect(page).toHaveURL(/\/history\/session-sep18$/);
    await expect(page.getByRole("heading", { name: "Sep 18, 2026" })).toBeVisible();
    await expect(page.getByRole("link", { name: /A2\.12 Level 2/ })).toBeVisible();
    await page.getByRole("link", { name: "Open", exact: true }).first().click();
    await expect(page).toHaveURL(/rep=360/);
    await expect(page).toHaveURL(/source=pano-1/);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Sep 18, 2026" })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/visit-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/visit-390.png`, fullPage: true });
    await assertNoHorizontalOverflow(page);
    health.assertClean();
  });

  test("two visits compare with dates visible, and refresh keeps the pair", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    const sep1 = page.locator("li").filter({ hasText: "Sep 1, 2026" });
    const sep15 = page.locator("li").filter({ hasText: "Sep 15, 2026" });
    await sep1.getByRole("button", { name: "Select for compare" }).click();
    await sep15.getByRole("button", { name: "Select for compare" }).click();
    await expect(page.getByRole("link", { name: "Compare" })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/history-selected-1440.png`, fullPage: true });
    await page.getByRole("link", { name: "Compare" }).click();
    await expect(page).toHaveURL(/a=capture-sep1/);
    await expect(page).toHaveURL(/b=capture-sep15/);
    await expect(page.getByText("Earlier Sep 1, 2026")).toBeVisible();
    await expect(page.getByText("Later Sep 15, 2026")).toBeVisible();
    await expect(page.getByText("These two scans aren't linked.")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Earlier Sep 1, 2026")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Compare" })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-aligned-1440.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-390.png`, fullPage: true });
    health.assertClean();
  });

  test("unaligned reality stays independent, and 360 does not claim one viewpoint", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INDEPENDENT, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("These two scans aren't linked.")).toBeVisible();
    await expect(page.getByText("Earlier Sep 1, 2026")).toBeVisible();
    await expect(page.getByText("Later Sep 15, 2026")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-independent-1440.png`, fullPage: true });
    await page.goto(ALIGNED, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/captured in the same space and line up/)).toBeVisible();
    await expect(page.getByText(/doesn't move them together/)).toBeVisible();
    await page.goto(PANO, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("not the same viewpoint")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-360-1440.png`, fullPage: true });
    await page.goto(THERMAL, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Earlier Aug 2, 2026")).toBeVisible();
    await expect(page.getByText("Later Sep 18, 2026")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compare-thermal-1440.png`, fullPage: true });
    health.assertClean();
  });

  test("empty, loading, error, and an unknown visit", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(EMPTY, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No visits recorded yet.")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/history-empty-1440.png`, fullPage: true });
    const loading = await page.goto("/preview/vnext/project/history-loading", { waitUntil: "domcontentloaded" });
    expect(loading?.status()).toBe(200);
    await expect(page.locator("[data-vnext-history-loading='true']")).toBeVisible();
    const errorPage = await page.goto("/preview/vnext/project/history-error", { waitUntil: "domcontentloaded" });
    expect(errorPage?.status()).toBe(200);
    await expect(page.getByText("Project history could not be loaded. Try again.")).toBeVisible();
    health.assertClean();
  });

  test("unknown visit and compare pair are not found", async ({ page }) => {
    const missing = await page.goto("/preview/vnext/project/history/missing-visit", { waitUntil: "domcontentloaded" });
    expect(missing?.status()).toBe(404);
    const badPair = await page.goto("/preview/vnext/project/history/compare?a=missing&b=also", { waitUntil: "domcontentloaded" });
    expect(badPair?.status()).toBe(404);
  });

  test("direct visit url stays on that visit", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(VISIT, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sep 18, 2026" })).toBeVisible();
    await expect(page.getByText("Water stain at east corridor")).toBeVisible();
    health.assertClean();
  });
});
