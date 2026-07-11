import { test, expect, type Page } from "@playwright/test";

/**
 * PAN Panorama (roster slice #15) — "Stitch panorama (N)" dispatch button in
 * Library's next-steps panel (doc D2/B2's headline contract). Runs against
 * /preview/thermal-v2 (6 fixture captures). See thermal-v2-r1-reliability.spec.ts
 * for warmBuildIdThenGoto. Actual OpenCV stitching runs on the deployed Modal
 * worker (verified separately via a synthetic local smoke test — see build log)
 * and can't run inside Playwright; these specs cover the dispatch contract.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 PAN panorama", () => {
  test.use({ serviceWorkers: "block" });

  test("Stitch panorama is hidden until at least 2 images are in scope", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await expect(page.getByRole("button", { name: /^Stitch panorama/ })).toHaveCount(0);

    await page.getByRole("radio", { name: /^All/ }).click();
    await expect(page.getByRole("button", { name: /^Stitch panorama \(6\)/ })).toBeVisible();
  });

  test("clicking Stitch panorama dispatches the scoped capture ids", async ({ page }) => {
    let dispatchBody: { captureIds?: string[] } | null = null;
    await page.route("**/api/ops/thermal/sessions/*/panorama", async (route) => {
      dispatchBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { dispatched: true, sources: 6 } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("radio", { name: /^All/ }).click();
    await page.getByRole("button", { name: /^Stitch panorama \(6\)/ }).click();

    await expect.poll(() => dispatchBody, { timeout: 3000 }).not.toBeNull();
    expect(dispatchBody!.captureIds?.sort()).toEqual(["a", "b", "c", "d", "e", "vis-1"]);
    await expect(page.getByText("Stitching in the cloud — the panorama will appear in Library when ready.")).toBeVisible();
  });

  test("a failed dispatch (no worker configured) surfaces the fallback message, not a crash", async ({ page }) => {
    await page.route("**/api/ops/thermal/sessions/*/panorama", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { dispatched: false, sources: 6 } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("radio", { name: /^All/ }).click();
    await page.getByRole("button", { name: /^Stitch panorama \(6\)/ }).click();
    await expect(page.getByText("Saved — will stitch once the cloud worker is enabled for this environment.")).toBeVisible();
  });
});
