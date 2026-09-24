import { test, expect } from "@playwright/test";
import { VNEXT_OWNER_FIELD_TOOLS, VNEXT_OWNER_NAV } from "../../lib/vnext/nav";
import { attachRuntimeHealth, openOwnerMenu, openOwnerMenuWithNavLinks } from "./helpers";

// The rendered owner menu shows VNEXT_OWNER_NAV (the /vnext/ops* routes) AND the separate
// VNEXT_OWNER_FIELD_TOOLS section (legacy operational routes, deliberately excluded from
// VNEXT_OWNER_NAV itself — see nav.test.ts) together, so link/tab-order counts here need both.
const OWNER_MENU_LINK_COUNT = VNEXT_OWNER_NAV.length + VNEXT_OWNER_FIELD_TOOLS.length;

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

    const { dialog: finalDialog } = await openOwnerMenuWithNavLinks(page, OWNER_MENU_LINK_COUNT);
    await finalDialog.getByRole("link", { name: "Clients" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    health.assertClean();
  });

  test("contains keyboard focus while open", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto("/preview/vnext/owner", { waitUntil: "load" });
    await openOwnerMenuWithNavLinks(page, OWNER_MENU_LINK_COUNT);
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    const tabbableCount = 1 + OWNER_MENU_LINK_COUNT;
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
