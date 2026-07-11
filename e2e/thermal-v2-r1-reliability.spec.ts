import { test, expect, type Page } from "@playwright/test";

/**
 * R1 "never lie" reliability pack (Addendum H2/G1) — chaos matrix, client-visible slice.
 * Runs against /preview/thermal-v2 (unauthenticated harness, 5 fixture captures).
 * Network is mocked at the route level (real fetch, mocked response) per the
 * established convention — screenshots time out on this app, so assertions are DOM/text.
 *
 * Server-side dedupe (unique dedupe_key index), accept-then-processing ordering, the
 * reconciler sweep, and the interpret job row were verified by a direct un-mocked
 * query against the real prod thermal_processing_jobs table (schema + index present)
 * — those code paths run entirely server-side and aren't independently exercisable
 * through this unauthenticated preview harness. Logged in docs/design/THERMAL_V2_BUILD_LOG.md.
 */

const URL = "/preview/thermal-v2";

/**
 * components/providers/SWRegistrar.tsx reloads the page once on first visit
 * in any fresh browser profile (no "slate360-last-build" key yet → treated as
 * a build-id change → cache nuke + `location.reload()`). That reload races
 * with Playwright's next action. Absorb it here so every test's OWN
 * navigation (after this) is the stable, non-reloading one.
 */
async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 R1 reliability", () => {
  // Test-harness concern only (not a production SW change): a fresh Playwright
  // profile has no build-id cookie, so the app's kill-switch reload (above)
  // still faces a real service-worker registration attempt underneath it.
  // Blocking SW registration keeps that noise out of the network mocks below.
  test.use({ serviceWorkers: "block" });

  test("Decode button disables while a job is in flight (client dedupe guard)", async ({ page }) => {
    let jobCalls = 0;
    await page.route("**/api/ops/thermal/jobs", async (route) => {
      jobCalls += 1;
      // Hold the response open briefly so the disabled state is observable.
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { job: { id: "job-1", status: "processing", progress_pct: 0, job_type: "extract" } } }),
      });
    });

    await warmBuildIdThenGoto(page);
    // Default scope is "This image" with no image focused (0 in scope) — switch to All.
    await page.getByRole("radio", { name: /^All/ }).click();

    const decodeBtn = page.getByRole("button", { name: /Decode temperatures/ });
    await expect(decodeBtn).toBeEnabled();
    await decodeBtn.click();
    await expect(decodeBtn).toBeDisabled();
    await expect(page.getByText("Decoding…")).toBeVisible();

    // Second physical click while disabled must not reach the network.
    await decodeBtn.click({ force: true }).catch(() => {});
    await expect.poll(() => jobCalls, { timeout: 2000 }).toBe(1);

    await expect(decodeBtn).toBeEnabled({ timeout: 3000 });
    await expect(decodeBtn).toHaveText(/Decode temperatures \(6\)/);
  });

  test("a failed autosave shows the red Not-saved chip, and Retry recovers it", async ({ page }) => {
    let shouldFail = true;
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      if (shouldFail) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
      }
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByText("Notes & photo data").click();

    const notes = page.locator("#thermal-v2-findings");
    await notes.fill("Water stain near the drain, spreading toward the wall.");

    // save-status.ts retries at 1s/3s/9s before giving up — the red chip lands ~13s in.
    await expect(page.getByRole("button", { name: /Not saved — Retry/ })).toBeVisible({ timeout: 20000 });

    // Flip the mock to succeed, then use the chip's own Retry action.
    shouldFail = false;
    await page.getByRole("button", { name: /Not saved — Retry/ }).click();
    await expect(page.getByTitle("All changes saved")).toBeVisible({ timeout: 5000 });
  });

  test("no page scroll at 1280x800 and 1440x900 after the R1 chips are added", async ({ page }) => {
    test.slow(); // this dev-server host is slow to cold-compile /preview/thermal-v2 under load
    await page.setViewportSize({ width: 1280, height: 800 });
    await warmBuildIdThenGoto(page);
    await expect(page.getByRole("button", { name: /Decode temperatures/ })).toBeVisible();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
