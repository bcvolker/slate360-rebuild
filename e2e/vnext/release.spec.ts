import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const DIR = "docs/vnext/screenshots/slice-10";

test.describe("vNext processing and publication", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("processing shows a real stage, a failure, and an empty queue", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/processing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-processing-row='run-1']")).toContainText("train");
    await expect(page.locator("[data-vnext-processing-row='run-1']")).toContainText("Worker reported 40%");
    await expect(page.locator("[data-vnext-processing-row='fail-1']")).toContainText("could not be rasterized");
    await expect(page.getByText("47%")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/processing-1440.png`, fullPage: true });
    await page.screenshot({ path: `${DIR}/processing-failed-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/processing-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/processing-empty", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Nothing is processing right now.")).toBeVisible();
    await page.screenshot({ path: `${DIR}/processing-empty-1440.png`, fullPage: true });
    await page.goto("/preview/vnext/owner/processing-error", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-processing-error]")).toContainText("could not be loaded");
    await expect(page.getByText("Nothing is processing right now.")).toHaveCount(0);
    health.assertClean();
  });

  test("qa lists review work and can show an empty queue", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/owner/qa", { waitUntil: "domcontentloaded" });
      await assertNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-vnext-qa-row='reality-model-b']")).toContainText("Harbor Street");
    await expect(page.getByText("West wall is too blurred.")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/qa-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNamedTouchTargets(page, "[data-vnext-shell='owner']");
    await page.screenshot({ path: `${DIR}/qa-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/qa-empty", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-qa-empty]")).toContainText("Nothing is waiting for review.");
    health.assertClean();
  });

  test("qa review uses the real viewer and client preview stays on the client shell", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/qa-reality", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Needs review")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByText(/drawing 3D in software|3D graphics turned off/)).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: `${DIR}/qa-reality-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/qa-reality-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/client-preview", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-client-preview]")).toContainText("Preview as client");
    await expect(page.locator("[data-vnext-shell='client']")).toBeVisible();
    await expect(page.getByText("Thermal")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/client-preview-1440.png` });
    await page.goto("/preview/vnext/owner/client-preview-candidate", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-client-preview]")).toContainText("candidate");
    await expect(page.locator("[data-vnext-client-preview]")).toContainText("Reality model B");
    await page.screenshot({ path: `${DIR}/client-preview-candidate-1440.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/client-preview-candidate-390.png` });
    health.assertClean();
  });

  test("plan and 360 review use the real viewers", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/qa-plan", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("A1.0")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByText("Preparing viewer")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/qa-plan-1440.png`, fullPage: true });
    health.assertClean();
    await page.goto("/preview/vnext/owner/qa-360", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-viewer-stage='360']")).toBeVisible();
    await expect(page.getByText("Preparing viewer")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/qa-360-1440.png`, fullPage: true });
    health.assertClean();
  });
});
