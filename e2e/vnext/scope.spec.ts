import { test, expect } from "@playwright/test";
import { attachRuntimeHealth } from "./helpers";

test.describe("vNext project delivery scope", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("profile A keeps Reality and 360 and omits Thermal", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/scope/a", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Reality · 360 · Plan")).toBeVisible();
    await expect(page.getByText("Ceiling scan")).toHaveCount(0);
    await expect(page.getByText("Thermal scan")).toHaveCount(0);
    await expect(page.getByText("Thermal", { exact: true })).toHaveCount(0);
    health.assertClean();
  });

  test("profile B is 360 and plans without Reality", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/scope/b", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Reality scan")).toHaveCount(0);
    await expect(page.getByText("Thermal scan")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Level 2 walk/ })).toBeVisible();
    health.assertClean();
  });

  test("profile C shows Reality and Thermal and omits 360", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/scope/c", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Ceiling scan")).toBeVisible();
    await expect(page.getByText("Reality scan").first()).toBeVisible();
    await expect(page.getByText("East corridor")).toHaveCount(0);
    health.assertClean();
  });

  test("a thermal deep link does not name Thermal when the project does not include it", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/project/explore?rep=thermal&scope=a", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-rep-option='thermal']")).toHaveCount(0);
    await expect(page.getByText(/isn't available/)).toHaveCount(0);
    await expect(page.getByText("Thermal", { exact: true })).toHaveCount(0);
    health.assertClean();
  });
});
