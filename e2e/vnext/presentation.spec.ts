import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const DIR = "docs/vnext/screenshots/slice-8";
const EXPLORE = "/preview/vnext/project/explore";

test.describe("vNext presentation", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("saves a titled view and rejects an empty title", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.getByRole("button", { name: "Save view" }).click();
    await expect(page.locator("[data-vnext-title-error]")).toHaveText("Enter a title.");
    await page.getByLabel("View title").fill("Level 2 corridor copy");
    await page.getByRole("button", { name: "Save view" }).click();
    await expect(page.getByRole("button", { name: "Level 2 corridor copy" })).toBeVisible();
    health.assertClean();
  });

  test("opens a saved view on its exact historical source", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${EXPLORE}?view=sv-history`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "model-sep18");
    await expect(page.locator("[data-vnext-view-date]")).toHaveText("Sep 18, 2026");
    await expect(page.locator("[data-vnext-view-title]")).toHaveText("Above-ceiling plumbing");
    await expect(page.locator("[data-vnext-viewer-stage='reality']")).toBeVisible();
    await page.locator("[data-vnext-explore-stage]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${DIR}/saved-historical-1440.png` });
    health.assertClean();
  });

  test("a missing historical source does not open the newest model", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?view=sv-gone`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-saved-view-unavailable]")).toHaveAttribute("data-vnext-saved-view-unavailable", "true");
    await expect(page.getByText("This saved view is not available.")).toBeVisible();
    await expect(page.locator("[data-vnext-viewer-stage]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "");
    health.assertClean();
  });

  test("a hidden capability cannot be opened from a saved view", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?scope=a&view=sv-thermal`, { waitUntil: "networkidle" });
    await expect(page.getByText("This saved view is not available.")).toBeVisible();
    await expect(page.getByText("Thermal", { exact: true })).toHaveCount(0);
    await expect(page.getByText("North wall inspection")).toHaveCount(0);
    health.assertClean();
  });

  test("restores a 360 yaw and pitch and a plan sheet with its item", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?view=sv-360`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-pano-yaw]")).toHaveAttribute("data-vnext-pano-yaw", "32");
    await expect(page.locator("[data-vnext-pano-pitch]")).toHaveAttribute("data-vnext-pano-pitch", "-8");
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "pano-1");
    await page.goto(`${EXPLORE}?view=sv-plan`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "sheet-1");
    await expect(page.locator("[data-vnext-plan-scale]")).toHaveAttribute("data-vnext-plan-scale", "2");
    await expect(page.locator("[data-vnext-item-context='item-plan']")).toBeVisible();
    health.assertClean();
  });

  test("renames and deletes a saved view", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.locator("[data-vnext-rename-view='sv-corridor']").click();
    await page.getByLabel("Rename view").fill("Corridor east");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page.getByRole("button", { name: "Corridor east" })).toBeVisible();
    await page.locator("[data-vnext-delete-view='sv-corridor']").click();
    await page.locator("[data-vnext-delete-confirm='sv-corridor']").click();
    await expect(page.getByRole("button", { name: "Corridor east" })).toHaveCount(0);
    health.assertClean();
  });

  test("browser Back, Forward, and refresh keep the saved view", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.getByRole("button", { name: /Above-ceiling plumbing/ }).click();
    await expect(page).toHaveURL(/view=sv-history/);
    await page.goBack();
    await expect(page).not.toHaveURL(/view=sv-history/);
    await page.goForward();
    await expect(page.locator("[data-vnext-view-date]")).toHaveText("Sep 18, 2026");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "model-sep18");
    health.assertClean();
  });

  test("presentation enters and exits", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${EXPLORE}?view=sv-history`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    await expect(page.locator("[data-vnext-rep-selector]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-saved-views]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-view-date]")).toHaveText("Sep 18, 2026");
    await page.screenshot({ path: `${DIR}/presentation-1440.png` });
    await page.getByRole("button", { name: "Exit presentation" }).click();
    await expect(page.locator("[data-vnext-explore-present='false']")).toBeVisible();
    await expect(page.locator("[data-vnext-saved-views]")).toBeVisible();
    health.assertClean();
  });

  test("plays, pauses, and restarts a camera path", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await expect(page.locator("[data-vnext-path-authoring='preview-reality']")).toBeVisible();
    await page.locator("[data-vnext-path-play]").click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await page.locator("[data-vnext-path-pause]").click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "paused");
    await page.locator("[data-vnext-path-restart]").click();
    await expect(page.locator("[data-vnext-playback-elapsed]")).toHaveAttribute("data-vnext-playback-elapsed", "0");
    await page.screenshot({ path: `${DIR}/camera-path-1440.png` });
    health.assertClean();
  });

  test("toggles the three framing guides", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    for (const aspect of ["16:9", "9:16", "1:1"] as const) {
      await page.locator(`[data-vnext-aspect='${aspect}']`).click();
      await expect(page.locator("[data-vnext-aspect-guide]")).toHaveAttribute("data-vnext-aspect-guide", aspect);
      await page.locator("[data-vnext-explore-stage]").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${DIR}/guide-${aspect.replace(":", "-")}-1440.png` });
    }
    health.assertClean();
  });

  test("shows an empty saved-view list", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${EXPLORE}?list=empty`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await expect(page.locator("[data-vnext-views-empty]")).toHaveText("No saved views");
    await page.screenshot({ path: `${DIR}/saved-views-empty-1440.png` });
    health.assertClean();
  });

  test("captures explore and presentation at desktop and phone widths", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(EXPLORE, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Views" }).click();
      await assertNoHorizontalOverflow(page);
      if (viewport.name === "1440" || viewport.name === "390") {
        await page.screenshot({ path: `${DIR}/saved-views-${viewport.name}.png`, fullPage: true });
        await assertNamedTouchTargets(page, "[data-vnext-saved-views]");
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${EXPLORE}?view=sv-history&present=1`, { waitUntil: "networkidle" });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/presentation-390.png` });
    health.assertClean();
  });
});
