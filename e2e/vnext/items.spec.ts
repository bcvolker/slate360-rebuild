import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const SCREENSHOT_DIR = "docs/vnext/screenshots/slice-5";
const LIST = "/preview/vnext/project/items";
const DETAIL = "/preview/vnext/project/items/item-plan";
const NOTE = "/preview/vnext/project/items/item-note";
const EXPLORE = "/preview/vnext/project/explore";

test.describe("vNext items", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  for (const viewport of VIEWPORTS) {
    test(`items list at ${viewport.name}`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(LIST, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Items", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Water stain at east corridor/ })).toBeVisible();
      await expect(page.getByText("Punchwalk")).toHaveCount(0);
      await expect(page.getByText("Site Walk")).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/items-${viewport.name}.png`, fullPage: true });
      health.assertClean();
    });
  }

  test("item detail at 1440 and 390", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Water stain at east corridor" })).toBeVisible();
    await expect(page.getByText("Level 2 – East Corridor")).toBeVisible();
    await expect(page.getByRole("link", { name: "View in project" })).toBeVisible();
    await expect(page.getByText("Is this an active leak")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resolve" })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/item-detail-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-shell='client']");
    const field = page.getByLabel("Ask a question");
    await field.scrollIntoViewIfNeeded();
    await field.focus();
    await expect(field).toBeFocused();
    const box = await field.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/item-detail-390.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/questions-390.png`, fullPage: true });
    health.assertClean();
  });

  test("questions on desktop", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
    await expect(page.getByText("Asked by Northwater Construction")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/questions-1440.png`, fullPage: true });
    health.assertClean();
  });

  test("plan location opens the sheet marker and returns to the item", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "View in project" }).click();
    await expect(page).toHaveURL(/rep=plan/);
    await expect(page).toHaveURL(/source=sheet-1/);
    await expect(page).toHaveURL(/item=item-plan/);
    await expect(page.locator("[data-vnext-plan-marker]")).toBeVisible();
    await expect(page.locator("[data-vnext-plan-marker]")).toHaveAttribute("data-x-pct", "62");
    await expect(page.getByText("Shown on this sheet")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/explore-plan-item-1440.png`, fullPage: true });
    await page.getByRole("link", { name: "View item" }).click();
    await expect(page).toHaveURL(/\/items\/item-plan$/);
    await page.goBack();
    await expect(page).toHaveURL(/rep=plan/);
    await page.goForward();
    await expect(page).toHaveURL(/\/items\/item-plan$/);
    health.assertClean();
  });

  test("a different sheet and Reality do not fake a marker", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${EXPLORE}?rep=plan&source=sheet-2&item=item-plan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Marked on another sheet")).toBeVisible();
    await expect(page.locator("[data-vnext-plan-marker]")).toHaveCount(0);
    await page.goto(`${EXPLORE}?rep=reality&item=item-plan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Marked on a plan")).toBeVisible();
    await expect(page.locator("[data-vnext-plan-marker]")).toHaveCount(0);
    health.assertClean();
  });

  test("search, status, and trade filters", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Search items").fill("shaft");
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByText("Water stain at east corridor")).toBeVisible();
    await page.getByLabel("Search items").fill("");
    await page.getByLabel("Filter by status").selectOption("closed");
    await expect(page.getByText("Foundation waterproofing")).toBeVisible();
    await expect(page.getByText("Water stain at east corridor")).toHaveCount(0);
    await page.getByLabel("Filter by status").selectOption("all");
    await page.getByLabel("Filter by trade").selectOption("Plumbing");
    await expect(page.getByText("Roof drain still holding water")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    health.assertClean();
  });

  test("opening an item supports back and forward", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(LIST, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Water stain at east corridor/ }).click();
    await expect(page).toHaveURL(/\/items\/item-plan$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/items\/?$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/items\/item-plan$/);
    await page.locator("[data-vnext-item-detail]").getByRole("link", { name: "Items", exact: true }).click();
    await expect(page).toHaveURL(/\/items\/?$/);
    health.assertClean();
  });

  test("an item without a spatial jump has no View in project control", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(NOTE, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Roof drain still holding water" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View in project" })).toHaveCount(0);
    await expect(page.getByText("No questions yet.")).toBeVisible();
    health.assertClean();
  });

  test("submits a trimmed question and blocks an empty one", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    let posted = "";
    await page.route("**/questions", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      posted = (route.request().postDataJSON() as { body: string }).body;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          question: {
            id: "q-new",
            body: posted,
            createdAt: "2026-09-21T00:00:00.000Z",
            dateLabel: "Sep 21, 2026",
            authorLabel: "You",
          },
        }),
      });
    });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    const field = page.getByLabel("Ask a question");
    await field.fill("   ");
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
    await field.fill("  Can you confirm the shaft is dry?  ");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Can you confirm the shaft is dry?")).toBeVisible();
    expect(posted).toBe("Can you confirm the shaft is dry?");
    health.assertClean();
  });

  test("disables send while a question is in flight", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/questions", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await gate;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          question: {
            id: "q-wait",
            body: "Following up.",
            createdAt: "2026-09-21T00:00:00.000Z",
            dateLabel: "Sep 21, 2026",
            authorLabel: "You",
          },
        }),
      });
    });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Ask a question").fill("Following up.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
    release();
    await expect(page.getByText("Following up.")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    health.assertClean();
  });

  test("shows a plain error when a question cannot be sent", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.route("**/questions", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "nope" }) });
    });
    await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Ask a question").fill("Is this still open?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator("[data-vnext-questions] [role='alert']")).toHaveText(
      "The question could not be sent. Try again.",
    );
  });

  test("empty, loading, and error states", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/project/items-empty", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No items yet for this project.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toHaveCount(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/items-empty-1440.png`, fullPage: true });
    await page.goto("/preview/vnext/project/items-loading", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-items-loading]")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/items-loading-1440.png`, fullPage: true });
    await page.goto("/preview/vnext/project/items-error", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Items could not be loaded. Check your connection and try again.")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Items could not be loaded. Check your connection and try again.")).toBeVisible();
    health.assertClean();
  });
});
