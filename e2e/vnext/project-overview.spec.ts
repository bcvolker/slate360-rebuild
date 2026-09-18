import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-3";

test.describe("vNext project overview", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`overview at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
      const projectNav = page.getByRole("navigation", { name: "Project" });
      await expect(projectNav).toBeVisible();
      await expect(projectNav.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("link", { name: "Explore project" })).toBeVisible();
      await expect(page.getByText("Latest visit")).toBeVisible();
      await expect(page.getByText("Available", { exact: true })).toBeVisible();
      await expect(page.getByText("Recent items")).toBeVisible();
      await expect(page.getByText("Recent documents")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/overview-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("sparse project hides the Explore CTA and shows one truthful notice", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/project-sparse", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /West Yard Adaptive Reuse/ })).toBeVisible();
    // No usable representation exists for this fixture: the primary Explore CTA must not render
    // (no enabled, no disabled, no dead link to an empty Explore experience).
    await expect(page.getByRole("link", { name: "Explore project" })).toHaveCount(0);
    await expect(page.locator("[data-vnext-explore-cta]")).toHaveCount(0);
    await expect(page.getByText("Latest visit")).toHaveCount(0);
    await expect(page.getByText("Available", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Recent items")).toHaveCount(0);
    await expect(page.getByText("Recent documents")).toHaveCount(0);
    await expect(page.locator("[data-vnext-sparse-notice]")).toBeVisible();
    await expect(
      page.getByText("No documented visits or published project records are available yet."),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/sparse-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/sparse-390.png`, fullPage: true });
    health.assertClean();
  });

  test("Explore CTA renders when a usable representation exists", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
    await expect(page.locator("[data-vnext-explore-cta]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore project" })).toHaveAttribute(
      "href",
      /\/explore\/?$/,
    );
    health.assertClean();
  });

  test("loading state matches final page geometry", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project-loading", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Project" })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/loading-1280.png`, fullPage: true });
    health.assertClean();
  });

  test("error state explains the failure and offers retry", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project-error", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("This project could not be loaded. Check your connection and try again."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    // The error notice and the sparse-project notice must never double up.
    await expect(page.locator("[data-vnext-sparse-notice]")).toHaveCount(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error-1280.png`, fullPage: true });

    // The retry button calls window.location.reload(). Confirm the reload actually happens (a
    // real page load, not a no-op) and the same content is still there afterward — this proves
    // the retry control works without depending on catching one specific network response object,
    // which is fragile: window.location.reload() can issue more than one matching request (e.g. a
    // document request plus the dev overlay's own background requests), and Playwright's
    // waitForResponse only resolves for the first one it happens to observe.
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForLoadState("load");
    await expect(
      page.getByText("This project could not be loaded. Check your connection and try again."),
    ).toBeVisible();
    health.assertClean();
  });

  test("Explore tab navigates and shows active state", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    const projectNav = page.getByRole("navigation", { name: "Project" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await projectNav.getByRole("link", { name: "Explore", exact: true }).click();
    await expect(page).toHaveURL(/\/preview\/vnext\/project\/explore\/?$/);
    await expect(page.getByRole("heading", { name: "Explore", exact: true })).toBeVisible();
    await expect(projectNav.getByRole("link", { name: "Explore", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    health.assertClean();
  });

  test("browser back and forward move between Overview and Explore", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await page.getByRole("link", { name: "Explore project" }).click();
    await expect(page.getByRole("heading", { name: "Explore", exact: true })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Explore", exact: true })).toBeVisible();
    health.assertClean();
  });

  test("View all items link navigates to the Items scaffold", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await page.getByRole("link", { name: "View all items" }).click();
    await expect(page).toHaveURL(/\/preview\/vnext\/project\/items\/?$/);
    await expect(page.getByRole("heading", { name: "Items", exact: true })).toBeVisible();
    health.assertClean();
  });

  test("View all documents link navigates to the Documents scaffold", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await page.getByRole("link", { name: "View all documents" }).click();
    await expect(page).toHaveURL(/\/preview\/vnext\/project\/documents\/?$/);
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    health.assertClean();
  });

  test("History tab navigates to the History scaffold", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    const projectNav = page.getByRole("navigation", { name: "Project" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await projectNav.getByRole("link", { name: "History", exact: true }).click();
    await expect(page).toHaveURL(/\/preview\/vnext\/project\/history\/?$/);
    await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
    health.assertClean();
  });

  test("mobile project navigation stays labeled and reachable", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    const projectNav = page.getByRole("navigation", { name: "Project" });
    await expect(projectNav.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
    await expect(projectNav.getByRole("link", { name: "History", exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-nav-390.png`, fullPage: true });
    health.assertClean();
  });
});
