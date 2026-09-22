import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-6a";
const PLANS = "/preview/vnext/project/documents-plans";
const UPLOAD = "/preview/vnext/project/documents-plans-upload";
const PDF = "/preview/vnext/project/documents/doc-ceiling";

test.describe("vNext project plans", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`project plans at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(PLANS, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Project plans" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Construction Drawings" })).toBeVisible();
      await expect(page.getByText("Rev 2")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open in Explore" })).toHaveAttribute("href", /rep=plan/);
      await expect(page.getByText("Processing")).toBeVisible();
      await expect(page.getByRole("link", { name: "A2.01 Floor plan" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Upload plans" })).toHaveCount(0);
      await expect(page.getByText("SlateDrop")).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/plans-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("open in Explore and return to the source document", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PLANS, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Open in Explore" }).click();
    await expect(page).toHaveURL(/\/explore\?rep=plan&source=sheet-a101/);
    await page.goBack();
    await expect(page).toHaveURL(/documents-plans/);
    await page.getByRole("link", { name: "Source: Level 2 reflected ceiling" }).click();
    await expect(page).toHaveURL(/\/documents\/doc-ceiling/);
    await page.getByRole("link", { name: "View sheets" }).click();
    await expect(page).toHaveURL(/documents-plans#plan-arch/);
    health.assertClean();
  });

  test("upload control is present only for a manager preview", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(UPLOAD, { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: "Upload plans" });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/plans-upload-390.png`, fullPage: true });
    await page.goto(PDF, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "View sheets" })).toBeVisible();
    health.assertClean();
  });
});
