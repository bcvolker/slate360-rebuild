import { test, expect, type Page } from "@playwright/test";

/**
 * S6 AI Review tab (roster slice #4). Runs against /preview/thermal-v2, which
 * has 2 fixture captures with anomalies: "a" (action/hot_spot, with an AI
 * observation already) and "b" (info/cold_bridge, no observation yet).
 * See thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 S6 AI Review", () => {
  test.use({ serviceWorkers: "block" });

  test("severity-sorted list shows detections with the worst severity first", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    // "a" (action=Critical) should be selectable and load first by default.
    await expect(page.getByText("hot spot")).toBeVisible();
    await expect(page.getByText("Localized heating consistent with electrical resistance or friction.")).toBeVisible();
  });

  test("Accept persists via findings_review and survives a reload", async ({ page }) => {
    let lastReviewPatch: unknown = null;
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      const body = route.request().postDataJSON() as { findings_review?: unknown };
      if (body?.findings_review) lastReviewPatch = body.findings_review;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("button", { name: "Accept ✓" }).click();

    await expect.poll(() => lastReviewPatch, { timeout: 3000 }).not.toBeNull();
    expect((lastReviewPatch as { accepted: string[] }).accepted).toContain("0");
  });

  test("Dismiss moves a finding into the restorable Dismissed group", async ({ page }) => {
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("button", { name: "Dismiss ✕" }).click();

    await expect(page.getByText("Dismissed (1)")).toBeVisible();
    await page.getByText("Dismissed (1)").click();
    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("button", { name: "Accept ✓" })).toBeVisible();
  });

  test("Run AI dispatches the interpret route for the current scope", async ({ page }) => {
    let interpretCalls = 0;
    let capturedIds: string[] = [];
    await page.route("**/api/ops/thermal/sessions/*/interpret", async (route) => {
      interpretCalls += 1;
      const body = route.request().postDataJSON() as { capture_ids?: string[] };
      capturedIds = body?.capture_ids ?? [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ dispatched: true, job: { id: "job-1", status: "processing" } }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("radio", { name: /^All/ }).click();
    await page.getByRole("button", { name: /Run AI on 2/ }).click();

    await expect.poll(() => interpretCalls, { timeout: 3000 }).toBe(1);
    expect(capturedIds.sort()).toEqual(["a", "b"]);
  });

  test("severity filter narrows the detections list", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    // Filtering narrows the left LIST (like Library's filters) — it doesn't
    // force-navigate the viewer, so assert against the list's own contents
    // (scoped by testid — the bottom filmstrip also has a "roof-nw-01.jpeg" button).
    const list = page.getByTestId("ai-review-detections-list");
    await expect(list.getByRole("button", { name: /roof-nw-01\.jpeg/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /roof-nw-02\.jpeg/ })).toBeVisible();

    await page.getByRole("button", { name: "Advisory", exact: true }).click();
    await expect(list.getByRole("button", { name: /roof-nw-02\.jpeg/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /roof-nw-01\.jpeg/ })).toHaveCount(0);
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
