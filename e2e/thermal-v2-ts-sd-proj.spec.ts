import { test, expect, type Page } from "@playwright/test";

/**
 * TS-SD + TS-PROJ (roster slice #6). The real route this slice adds
 * (/thermal-studio-v2/[sessionId], CEO-gated) can't be Playwright-driven here
 * — per CLAUDE.md, thermal UI auth can't be sandboxed in this environment.
 * This spec verifies what IS testable: the initialTab deep-link mechanism
 * (shared by the real route's ?report=1 and this harness's ?tab=) via the
 * unauthenticated /preview/thermal-v2 harness. The CEO gate itself and the
 * Deliverables-folder bridge fix are verified separately (see build log).
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page, path: string = URL) {
  await page.goto(path);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(path);
}

test.describe("Thermal V2 TS-SD/TS-PROJ", () => {
  test.use({ serviceWorkers: "block" });

  test("?tab=report deep-links straight to the Report tab (TS-SD re-open mechanism)", async ({ page }) => {
    await warmBuildIdThenGoto(page, `${URL}?tab=report`);
    await expect(page.getByRole("button", { name: "Report", exact: true })).toHaveClass(/graphite-primary/);
  });

  test("default load (no ?tab=) still opens on Library", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await expect(page.getByRole("button", { name: "Library", exact: true })).toHaveClass(/graphite-primary/);
  });
});
