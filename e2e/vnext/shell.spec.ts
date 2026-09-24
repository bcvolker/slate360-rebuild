import { test, expect } from "@playwright/test";
import {
  VNEXT_CLIENT_NAV,
  VNEXT_OWNER_FIELD_TOOLS,
  VNEXT_OWNER_NAV,
  VNEXT_OWNER_PRIMARY_NAV,
} from "../../lib/vnext/nav";
import {
  VIEWPORTS,
  assertNamedTouchTargets,
  assertNoHorizontalOverflow,
  attachRuntimeHealth,
  openOwnerMenuWithNavLinks,
} from "./helpers";

test.describe("vNext client shell", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`client preview at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/client", { waitUntil: "domcontentloaded" });

      const shell = page.locator("[data-vnext-shell='client']");
      await expect(shell).toBeVisible();

      const home = page.getByRole("link", { name: "Slate360 home" });
      await expect(home).toHaveAttribute("href", "/vnext/projects");

      for (const item of VNEXT_CLIENT_NAV) {
        const link = page.getByRole("navigation", { name: "Client" }).getByRole("link", {
          name: item.label,
          exact: true,
        });
        await expect(link).toHaveAttribute("href", item.href);
      }

      await expect(
        page.getByRole("navigation", { name: "Client" }).getByRole("link", { name: "Projects" }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("navigation", { name: "Client" }).getByRole("link", { name: "Account" }),
      ).not.toHaveAttribute("aria-current", "page");

      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      if (viewport.name === "1440" || viewport.name === "390") {
        await page.screenshot({
          path: `docs/vnext/screenshots/slice-3-correction/client-shell-${viewport.name}.png`,
          fullPage: true,
        });
      }
      health.assertClean();
    });
  }
});

test.describe("vNext owner shell", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`owner preview at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/owner", { waitUntil: "domcontentloaded" });

      const shell = page.locator("[data-vnext-shell='owner']");
      await expect(shell).toBeVisible();
      await expect(page.getByRole("link", { name: "Slate360 home" })).toHaveAttribute(
        "href",
        "/vnext/ops",
      );

      const menu = page.getByRole("button", { name: "Menu" });
      const useDrawer = viewport.width < 1024;

      if (useDrawer) {
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await expect(menu).toHaveAttribute("aria-haspopup", "dialog");
        // The rendered menu shows VNEXT_OWNER_NAV plus the separate Field Tools section (legacy
        // operational routes deliberately excluded from VNEXT_OWNER_NAV itself — see nav.test.ts).
        await openOwnerMenuWithNavLinks(page, VNEXT_OWNER_NAV.length + VNEXT_OWNER_FIELD_TOOLS.length);
        const dialog = () => page.getByRole("dialog", { name: "Menu" });

        for (const item of VNEXT_OWNER_NAV) {
          await expect(dialog().getByRole("link", { name: item.label, exact: true })).toHaveAttribute(
            "href",
            item.href,
          );
        }

        await expect(dialog().getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(dialog().getByRole("link", { name: "Clients" })).not.toHaveAttribute(
          "aria-current",
          "page",
        );

        await dialog().getByRole("button", { name: "Close" }).click();
        await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
        await expect(menu).toBeFocused();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
      } else {
        await expect(menu).toBeHidden();
        const ownerNav = page.getByRole("navigation", { name: "Owner" });
        for (const item of VNEXT_OWNER_PRIMARY_NAV) {
          await expect(ownerNav.getByRole("link", { name: item.label, exact: true })).toHaveAttribute(
            "href",
            item.href,
          );
        }
        await expect(ownerNav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
      }

      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='owner']");
      if (viewport.name === "1440" || viewport.name === "390") {
        await page.screenshot({
          path: `docs/vnext/screenshots/slice-3-correction/owner-shell-${viewport.name}.png`,
          fullPage: true,
        });
      }
      health.assertClean();
    });
  }
});
