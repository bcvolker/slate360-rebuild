import { test, expect } from "@playwright/test";
import { LEGACY_LANDINGS, attachRuntimeHealth } from "./helpers";

const AUTH_ROUTES = [
  "/vnext",
  "/vnext/projects",
  "/vnext/account",
  "/vnext/ops",
  "/vnext/ops/clients",
  "/vnext/ops/projects",
  "/vnext/ops/processing",
  "/vnext/ops/qa",
  "/vnext/ops/shares",
  "/vnext/ops/settings",
  "/vnext/ops/account",
] as const;

function expectedRedirectTo(path: string): string {
  if (path === "/vnext") return "/vnext/projects";
  return path;
}

test.describe("vNext route smoke", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const path of AUTH_ROUTES) {
    test(`unauthenticated ${path} preserves login redirectTo`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("redirectTo")).toBe(expectedRedirectTo(path));
      for (const legacy of LEGACY_LANDINGS) {
        expect(url.pathname === legacy || url.pathname.startsWith(`${legacy}/`)).toBe(false);
      }
      health.assertClean();
    });
  }

  test("preview fixtures and production homes remain", async ({ page, request }) => {
    const health = attachRuntimeHealth(page);
    const client = await page.goto("/preview/vnext/client", { waitUntil: "domcontentloaded" });
    expect(client?.status()).toBe(200);
    const owner = await page.goto("/preview/vnext/owner", { waitUntil: "domcontentloaded" });
    expect(owner?.status()).toBe(200);
    const ownerMenu = await page.goto("/preview/vnext/owner-menu", { waitUntil: "domcontentloaded" });
    expect(ownerMenu?.status()).toBe(200);

    const dashboard = await request.get("/dashboard", { maxRedirects: 0 });
    expect(dashboard.status()).not.toBe(404);
    const appHome = await request.get("/app", { maxRedirects: 0 });
    expect(appHome.status()).not.toBe(404);
    health.assertClean();
  });
});
