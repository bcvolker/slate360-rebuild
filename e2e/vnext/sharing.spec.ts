import { expect, test } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const DIR = "docs/vnext/screenshots/slice-11";

test.describe("vNext sharing", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("owner shares list, copy, and revoke", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/owner/shares", { waitUntil: "domcontentloaded" });
      await assertNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-vnext-share-row='link-live']")).toContainText("Active");
    await expect(page.locator("[data-vnext-share-row='link-live']")).toContainText("Opens 3");
    await expect(page.locator("[data-vnext-share-row='link-old']")).toContainText("Expired");
    await expect(page.getByText("unique viewers")).toHaveCount(0);
    await page.locator("[data-vnext-share-create]").screenshot({ path: `${DIR}/shares-create-1440.png` });
    await page.screenshot({ path: `${DIR}/shares-1440.png`, fullPage: true });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("/share/project/");
    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText("Revoke this link?")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Revoke this link?")).toHaveCount(0);
    await page.getByRole("button", { name: "Revoke" }).click();
    await page.getByRole("button", { name: "Revoke link" }).click();
    await expect(page.locator("[data-vnext-share-row='link-live']")).toContainText("Revoked");
    await page.screenshot({ path: `${DIR}/shares-revoked-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-share-board]");
    await page.screenshot({ path: `${DIR}/shares-390.png`, fullPage: true });
    health.assertClean();
  });

  test("public project and evidence links stay on the published view", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/share/project", { waitUntil: "domcontentloaded" });
      await assertNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
    await expect(page.getByText("Thermal")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Items" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Documents" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save view" })).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/public-project-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNamedTouchTargets(page, "[data-vnext-shell='public']");
    await page.screenshot({ path: `${DIR}/public-project-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/share/history", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No project history has been published yet.")).toBeVisible();
    await expect(page.getByText("Thermal")).toHaveCount(0);
    await page.goto("/preview/vnext/share/evidence", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Above-ceiling plumbing")).toBeVisible();
    await expect(page.getByText("Sep 18, 2026")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save view" })).toHaveCount(0);
    await expect(page.getByText(/drawing 3D in software|3D graphics turned off/)).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: `${DIR}/public-evidence-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/public-evidence-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/share/unavailable", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "This link is not available." })).toBeVisible();
    await expect(page.getByText("Harbor Street Residence")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/public-unavailable-1440.png`, fullPage: true });
    health.assertClean();
  });
});
