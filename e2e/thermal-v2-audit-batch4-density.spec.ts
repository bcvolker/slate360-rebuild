import { test, expect, type Page } from "@playwright/test";

/**
 * Audit remediation Batch 4 (docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md
 * §4) — text-overflow fixes (min-w-0/truncate/break-words) on the specific
 * flex-row spots the audit named: Motion's ruler status line, Analyze's
 * Notes metadata rows, and the Fusion blend/scale labels. The existing
 * "no page scroll" specs only cover 1280x800/1440x900 — this re-runs the
 * same no-horizontal-overflow check at a sub-1280px width, since that's
 * where the fixed spots were actually at risk of clipping. Runs against
 * /preview/thermal-v2. See thermal-v2-r1-reliability.spec.ts for
 * warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";
const NARROW = { width: 1024, height: 768 };

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

async function mockGrid(page: Page) {
  await page.route("**/api/ops/thermal/captures/*/grid", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ width: 4, height: 4, temps: Array.from({ length: 16 }, (_, i) => 20 + i), minC: 20, maxC: 35, emissivity: 0.95 }),
    }),
  );
}

async function noHorizontalOverflow(page: Page, label: string) {
  const overflowed = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflowed, `${label} — page overflowed horizontally at ${NARROW.width}px`).toBe(false);
}

test.describe("Thermal V2 audit remediation — Batch 4 density at sub-1280px", () => {
  test.use({ serviceWorkers: "block" });

  test("Analyze's Fusion blend/scale controls and Notes metadata rows fit at 1024px", async ({ page }) => {
    await mockGrid(page);
    await page.setViewportSize(NARROW);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.locator("canvas").first()).toBeVisible();

    await page.getByRole("button", { name: /^Display/ }).click();
    await expect(page.getByText("Fusion — thermal over paired visual photo")).toBeVisible();
    await noHorizontalOverflow(page, "Fusion controls open");

    await page.getByRole("button", { name: /^Notes/ }).click();
    await noHorizontalOverflow(page, "Notes & photo data open");
  });

  test("Deliver's Motion (Timelapse Builder) ruler fits at 1024px", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver", exact: true }).click();
    await page.getByRole("button", { name: "Motion", exact: true }).click();
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();
    await expect(page.getByText(/frames in range/)).toBeVisible();
    await noHorizontalOverflow(page, "Timelapse Builder ruler open");
  });
});
