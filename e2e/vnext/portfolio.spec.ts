import { test, expect, type Page } from "@playwright/test";
import {
  VIEWPORTS,
  assertNamedTouchTargets,
  assertNoHorizontalOverflow,
  attachRuntimeHealth,
} from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-2";

async function setSearchQuery(page: Page, value: string) {
  const search = page.locator("[data-vnext-search='true']");
  await expect(search).toBeVisible();
  await search.fill(value);
  await expect(search).toHaveValue(value);
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("q") === value),
    search.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.form?.requestSubmit();
    }),
  ]);
  await expect(page.locator("[data-vnext-query]")).toHaveAttribute("data-vnext-query", value);
}

test.describe("vNext client portfolio", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`normal portfolio at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/preview/vnext/client", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Harbor Street Residence/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /Stone Court/ })).toBeVisible();
      await expect(page.getByRole("searchbox", { name: "Search projects" })).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/client-${viewport.name}.png`,
        fullPage: true,
      });
      health.assertClean();
    });
  }

  test("search, clear, no-results, back, forward, and project open", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/client", { waitUntil: "domcontentloaded" });

    await setSearchQuery(page, "Harbor");
    await expect(page.locator("[data-vnext-project-card]")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Harbor Street Residence/ })).toBeVisible();

    await page.getByRole("link", { name: "Clear", exact: true }).click();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page.getByRole("searchbox", { name: "Search projects" })).toHaveValue("");
    await expect(page.getByRole("link", { name: /Stone Court/ })).toBeVisible();

    await setSearchQuery(page, "zzzz-no-match");
    await expect(page.getByText(/No projects match/)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/search-no-results-390.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page.getByRole("searchbox", { name: "Search projects" })).toHaveValue("");

    const first = page.getByRole("link", { name: /Harbor Street Residence/ });
    await first.click();
    await expect(page).toHaveURL(/\/preview\/vnext\/project\/?$/);
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("searchbox", { name: "Search projects" })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
    health.assertClean();
  });

  test("empty, error retry, loading, and scaffold deep link", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/preview/vnext/portfolio-empty", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("There are no projects available to this account.")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/preview/vnext/client", { waitUntil: "domcontentloaded" });
    const stoneCourt = page.getByRole("link", { name: /Stone Court/ });
    await stoneCourt.scrollIntoViewIfNeeded();
    await expect(stoneCourt).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/neutral-fallback-390.png`, fullPage: true });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/preview/vnext/portfolio-error", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("Projects could not be loaded. Check your connection and try again."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    await page.goto("/preview/vnext/portfolio-loading", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

    await page.goto("/preview/vnext/project", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Harbor Street Residence" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Client" }).getByRole("link", { name: "Projects" }),
    ).toHaveAttribute("aria-current", "page");
    health.assertClean();
  });
});
