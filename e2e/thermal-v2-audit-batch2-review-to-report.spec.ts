import { test, expect, type Page } from "@playwright/test";

/**
 * Audit remediation Batch 2 (docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md
 * §3) — the operator's AI Review Accept/Edit/Dismiss decisions must reach every
 * deliverable, and the Report outline must honestly disclose (not silently
 * mask) when nothing has been curated yet. Runs against /preview/thermal-v2.
 * See thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

test.describe("Thermal V2 audit remediation — Batch 2 review reaches every deliverable", () => {
  test.use({ serviceWorkers: "block" });

  test("dismissing a finding in AI Review keeps it out of the Report", async ({ page }) => {
    await page.route("**/api/ops/thermal/captures/a", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          captureId: "a",
          metadata: { findings_review: { accepted: [], dismissed: ["0"], edits: {} } },
        }),
      });
    });
    await page.route("**/api/ops/thermal/sessions/preview", (route) =>
      route.request().method() === "PATCH" ? route.fulfill({ status: 200, contentType: "application/json", body: "{}" }) : route.continue(),
    );

    await warmBuildIdThenGoto(page);

    await page.getByRole("button", { name: "AI Review", exact: true }).click();
    await page.getByRole("button", { name: "Dismiss ✕" }).click();
    // Past useFindingsReview's 400ms debounce before it calls patchCaptureWithStatus.
    await page.waitForTimeout(700);

    // Add capture "a" to the report (Library scope defaults to "This image" —
    // click its thumbnail to focus it, then use the scoped ★ action).
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.locator('button[title*="roof-nw-01.jpeg"]').click();
    await page.getByRole("button", { name: /★ Add 1 to report/ }).click();

    await page.getByRole("button", { name: "Report", exact: true }).click();
    await expect(
      page.getByText("Localized heating consistent with electrical resistance or friction."),
    ).not.toBeVisible();
  });

  test("removing an image from the Report outline works, and an empty outline honestly discloses the all-images fallback", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();

    // The preview fixture seeds capture "b" with metadata.in_report: true.
    await expect(page.getByText("Images (1)")).toBeVisible();
    await page.getByRole("button", { name: /Remove roof-nw-02\.jpeg from report/ }).click();

    await expect(page.getByText("Star ★ images in Library to add them here.")).toBeVisible();
    // Before this fix, ReportPanel flattened an empty order into "every
    // capture" before ThermalReportPreview ever saw it — so this disclosure
    // banner (which the preview has always had) never actually rendered.
    await expect(page.getByText(/Previewing all \d+ images/)).toBeVisible();
  });
});
