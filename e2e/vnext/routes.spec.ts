import { test, expect } from "@playwright/test";
import { LEGACY_LANDINGS, attachRuntimeHealth } from "./helpers";

const AUTH_ROUTES = [
  "/vnext",
  "/vnext/projects",
  "/vnext/projects/11111111-1111-4111-8111-111111111111",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/explore",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/items",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/documents",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/history",
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
    const empty = await page.goto("/preview/vnext/portfolio-empty", { waitUntil: "domcontentloaded" });
    expect(empty?.status()).toBe(200);
    const errorPage = await page.goto("/preview/vnext/portfolio-error", { waitUntil: "domcontentloaded" });
    expect(errorPage?.status()).toBe(200);
    const loading = await page.goto("/preview/vnext/portfolio-loading", { waitUntil: "domcontentloaded" });
    expect(loading?.status()).toBe(200);
    const project = await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    expect(project?.status()).toBe(200);

    const dashboard = await request.get("/dashboard", { maxRedirects: 0 });
    expect(dashboard.status()).not.toBe(404);
    const appHome = await request.get("/app", { maxRedirects: 0 });
    expect(appHome.status()).not.toBe(404);
    health.assertClean();
  });

  test("project overview preview fixtures render", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    const projectExplore = await page.goto("/preview/vnext/project/explore", { waitUntil: "domcontentloaded" });
    expect(projectExplore?.status()).toBe(200);
    const projectItems = await page.goto("/preview/vnext/project/items", { waitUntil: "domcontentloaded" });
    expect(projectItems?.status()).toBe(200);
    const projectDocuments = await page.goto("/preview/vnext/project/documents", { waitUntil: "domcontentloaded" });
    expect(projectDocuments?.status()).toBe(200);
    const projectHistory = await page.goto("/preview/vnext/project/history", { waitUntil: "domcontentloaded" });
    expect(projectHistory?.status()).toBe(200);
    health.assertClean();
  });

  test("sparse, loading, and error project preview fixtures render", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    const projectSparse = await page.goto("/preview/vnext/project-sparse", { waitUntil: "domcontentloaded" });
    expect(projectSparse?.status()).toBe(200);
    const projectLoading = await page.goto("/preview/vnext/project-loading", { waitUntil: "domcontentloaded" });
    expect(projectLoading?.status()).toBe(200);
    const projectError = await page.goto("/preview/vnext/project-error", { waitUntil: "domcontentloaded" });
    expect(projectError?.status()).toBe(200);
    health.assertClean();
  });
});
