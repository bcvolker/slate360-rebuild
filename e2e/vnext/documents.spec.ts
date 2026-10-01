import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-6";
const LIST = "/preview/vnext/project/documents";
const DETAIL = "/preview/vnext/project/documents/doc-photo";
const PDF = "/preview/vnext/project/documents/doc-ceiling";

test.describe("vNext documents", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`documents list at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(LIST, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Level 2 reflected ceiling/ })).toBeVisible();
      await expect(page.getByText("SlateDrop")).toHaveCount(0);
      await expect(page.getByText("Upload")).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/documents-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("search results at 1440 and 390", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Search this project").fill("Level 2");
    await expect(page.getByRole("link", { name: /A2.12 Level 2 reflected ceiling/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Water stain at east corridor/ })).toBeVisible();
    await page.getByLabel("Search this project").press("Enter");
    await expect(page).toHaveURL(/q=Level\+2|q=Level%202/);
    await page.getByLabel("Filter results").selectOption("plan");
    await expect(page.getByRole("link", { name: /A2.12/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Water stain at east corridor/ })).toHaveCount(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-390.png`, fullPage: true });
    health.assertClean();
  });

  test("document detail, related item, and back", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "East corridor condition" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/mock/sitewalk.jpg");
    await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute("href", "/mock/sitewalk.jpg");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/document-detail-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/document-detail-390.png`, fullPage: true });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PDF, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Related item: Water stain at east corridor" }).click();
    await expect(page).toHaveURL(/\/items\/item-plan/);
    await page.goBack();
    await expect(page).toHaveURL(/\/documents\/doc-ceiling/);
    health.assertClean();
  });

  test("folder filter and browser back", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Filter by folder").selectOption({ label: "Drawings" });
    await expect(page).toHaveURL(/folder=folder-drawings/);
    await expect(page.getByRole("link", { name: /Level 2 reflected ceiling/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Equipment schedule/ })).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole("link", { name: /Equipment schedule/ })).toBeVisible();
    health.assertClean();
  });

  test("spreadsheet has download and no open", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    const row = page.locator("li", { hasText: "Equipment schedule" });
    await expect(row.getByRole("link", { name: "Download" })).toBeVisible();
    await expect(row.getByRole("link", { name: "Open" })).toHaveCount(0);
    health.assertClean();
  });

  test("empty, loading, and error states", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/project/documents-empty", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No documents yet for this project.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload" })).toHaveCount(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/documents-empty-1440.png`, fullPage: true });
    await page.goto("/preview/vnext/project/documents-loading", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-documents-loading]")).toBeVisible();
    await page.goto("/preview/vnext/project/documents-error", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Documents could not be loaded. Try again.")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Documents could not be loaded. Try again.")).toBeVisible();
    health.assertClean();
  });
});
