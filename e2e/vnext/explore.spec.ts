import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-4";
const EXPLORE = "/preview/vnext/project/explore";

test.describe("vNext Explore", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("defaults to Reality when no ?rep= is present", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='reality']")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-vnext-viewer-stage='reality']")).toBeVisible();
    health.assertClean();
  });

  test("switching representation via the selector updates the URL and the active tab", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
    await page.locator("[data-vnext-rep-option='geometry']").click();
    await expect(page).toHaveURL(/\?rep=geometry$/);
    await expect(page.locator("[data-vnext-rep-option='geometry']")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-vnext-viewer-stage='geometry']")).toBeVisible();
    health.assertClean();
  });

  test("deep link to ?rep=plan opens directly on Plan", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?rep=plan`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='plan']")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-vnext-viewer-stage='plan']")).toBeVisible();
    health.assertClean();
  });

  test("browser Back and Forward move between representations", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
    await page.locator("[data-vnext-rep-option='360']").click();
    await expect(page.locator("[data-vnext-viewer-stage='360']")).toBeVisible();

    await page.goBack();
    await expect(page.locator("[data-vnext-viewer-stage='reality']")).toBeVisible();
    await page.goForward();
    await expect(page.locator("[data-vnext-viewer-stage='360']")).toBeVisible();
    health.assertClean();
  });

  test("refresh preserves the requested representation", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?rep=thermal`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='thermal']")).toHaveAttribute("aria-current", "true");
    health.assertClean();
  });

  test("an invalid ?rep= falls back to the default representation with no dead viewer", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?rep=not-a-real-representation`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='reality']")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-vnext-explore-error]")).toHaveCount(0);
    health.assertClean();
  });

  test("Drone never appears as a representation choice", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?rep=drone`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='drone']")).toHaveCount(0);
    await expect(page.getByText("Drone", { exact: true })).toHaveCount(0);
    // Silently falls back — Drone never gets acknowledged with an "isn't available" message either.
    await expect(page.locator("[data-vnext-rep-option='reality']")).toHaveAttribute("aria-current", "true");
    health.assertClean();
  });

  test("source picker switches which 360 photo is shown and updates the URL", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?rep=360`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-source-option='pano-1']")).toHaveAttribute("aria-current", "true");
    await page.locator("[data-vnext-source-option='pano-2']").click();
    await expect(page).toHaveURL(/rep=360.*source=pano-2|source=pano-2.*rep=360/);
    await expect(page.locator("[data-vnext-source-option='pano-2']")).toHaveAttribute("aria-current", "true");
    health.assertClean();
  });

  test("presentation mode hides chrome, goes full-bleed, and Exit restores it", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    // networkidle, not domcontentloaded: this route's first-ever load in a fresh context runs a
    // service-worker build-id cache nuke (confirmed via scripts/ops/debug-present-click.mjs) that can
    // still be settling right at domcontentloaded — a click fired before it settles can be discarded
    // by the reload it triggers. The other Explore tests click real <a href> links, which survive that
    // fine (the browser just navigates); this test's Present/Escape controls are JS-driven and need
    // hydration to have actually finished first.
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page).toHaveURL(/present=1/);
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    await expect(page.locator("[data-vnext-rep-selector]")).toHaveCount(0);
    const projectNav = page.getByRole("navigation", { name: "Project" });
    await expect(projectNav).toHaveAttribute("inert", "");
    await expect(page.getByRole("button", { name: "Exit presentation" })).toBeVisible();

    await page.getByRole("button", { name: "Exit presentation" }).click();
    await expect(page).not.toHaveURL(/present=1/);
    await expect(page.locator("[data-vnext-rep-selector]")).toBeVisible();
    await expect(projectNav).not.toHaveAttribute("inert", "");
    health.assertClean();
  });

  test("presentation mode exits on Escape", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?present=1`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-vnext-explore-present='false']")).toBeVisible();
    health.assertClean();
  });

  test("deep link directly into presentation mode renders full-bleed with the underlying chrome inert", async ({
    page,
  }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?present=1`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    // The project nav stays in the DOM (only visually covered by the fixed overlay), so Playwright's
    // CSS-based toBeVisible() would report it visible regardless — `inert` is the real, testable proxy
    // for "not reachable by keyboard/screen readers while presenting."
    await expect(page.getByRole("navigation", { name: "Project" })).toHaveAttribute("inert", "");
    health.assertClean();
  });

  test("help disclosure shows representation-aware copy", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
    await page.locator("[data-vnext-explore-help] summary").click();
    await expect(page.getByText("photo-real 3D reconstruction")).toBeVisible();
    health.assertClean();
  });

  test("no representations renders the empty state with a way back, not a dead viewer", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/project/explore-empty", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-explore-empty]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to overview" })).toBeVisible();
    await expect(page.locator("[data-vnext-rep-selector]")).toHaveCount(0);
    health.assertClean();
  });

  test("a failed representation load shows a concise error, not a blank/hanging viewer", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/project/explore-error", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-explore-error]")).toBeVisible();
    await expect(page.locator("[data-vnext-viewer-stage]")).toHaveCount(0);
    health.assertClean();
  });

  for (const viewport of VIEWPORTS) {
    test(`Explore at ${viewport.name} has no horizontal overflow and touch-sized controls`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-vnext-viewer-stage='reality']")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-rep-selector]");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/explore-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("no legacy-route navigation from Explore", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    const legacy = ["/dashboard", "/app", "/site-walk", "/twin", "/thermal-studio", "/slatedrop"];
    for (const href of hrefs) {
      if (!href) continue;
      expect(legacy.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))).toBe(false);
    }
    health.assertClean();
  });
});
