import { test, expect } from "@playwright/test";
import { VNEXT_OWNER_NAV } from "../../lib/vnext/nav";
import { attachRuntimeHealth, openOwnerMenu, openOwnerMenuWithNavLinks } from "./helpers";

test.describe("vNext owner drawer", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(90_000);

  test("closes through Close, backdrop, Escape, and navigation", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/owner", { waitUntil: "load" });
    await expect(page.locator("[data-vnext-shell='owner']")).toBeVisible();
    const { menu } = await openOwnerMenu(page);
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(menu).toBeFocused();

    await openOwnerMenu(page);
    await page.locator("[data-vnext-drawer-backdrop]").click({ position: { x: 8, y: 80 } });
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(menu).toBeFocused();

    await openOwnerMenu(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(menu).toBeFocused();

    const { dialog: finalDialog } = await openOwnerMenuWithNavLinks(page, VNEXT_OWNER_NAV.length);
    await finalDialog.getByRole("link", { name: "Clients" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    health.assertClean();
  });

  test("contains keyboard focus while open", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/owner", { waitUntil: "load" });
    await openOwnerMenuWithNavLinks(page, VNEXT_OWNER_NAV.length);
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    const tabbableCount = 1 + VNEXT_OWNER_NAV.length;
    for (let index = 0; index < tabbableCount; index += 1) {
      await page.keyboard.press("Tab");
    }
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link", { name: "Account", exact: true })).toBeFocused();
    health.assertClean();
  });

  test("does not scroll the page behind the open drawer", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/owner", { waitUntil: "load" });
    await openOwnerMenu(page);
    const overflow = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflow,
      root: getComputedStyle(document.documentElement).overflow,
    }));
    expect(overflow.body).toBe("hidden");
    expect(overflow.root).toBe("hidden");
    health.assertClean();
  });
});
