import { test, expect, type Page } from "@playwright/test";

/**
 * S7 Reports (roster slice #5). Runs against /preview/thermal-v2, which has
 * one fixture capture ("b") already marked in_report so the outline isn't
 * empty on load. See thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

async function mockSessionAndTemplates(page: Page) {
  await page.route("**/api/ops/thermal/report-templates", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templates: [] }) }),
  );
  let lastSessionPatch: unknown = null;
  await page.route("**/api/ops/thermal/sessions/preview", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: { name: "Oak Ridge Roof", branding_config: {}, summary_metrics: {}, metadata: {} } }),
      });
      return;
    }
    lastSessionPatch = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ session: {} }) });
  });
  await page.route("**/api/ops/thermal/sessions/preview/reports", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }) }),
  );
  return () => lastSessionPatch;
}

test.describe("Thermal V2 S7 Reports", () => {
  test.use({ serviceWorkers: "block" });

  test("WYSIWYG preview renders the session as paper sheets with the seeded ★ image in the outline", async ({ page }) => {
    await mockSessionAndTemplates(page);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Oak Ridge Roof" })).toBeVisible();
    await expect(page.getByText("Images (1)")).toBeVisible();
    // Both the outline row and the WYSIWYG preview's page heading show the
    // filename — that duplication is the point (outline and preview agree).
    await expect(page.getByText("roof-nw-02.jpeg").first()).toBeVisible();
  });

  test("selecting a template persists via session PATCH", async ({ page }) => {
    const getLastPatch = await mockSessionAndTemplates(page);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();

    await page.getByRole("button", { name: "Detailed / Forensic" }).click();

    await expect.poll(() => (getLastPatch() as { metadata?: { report?: { templateId?: string } } } | null)?.metadata?.report?.templateId, {
      timeout: 3000,
    }).not.toBeUndefined();
  });

  test("editing branding updates the live preview and persists", async ({ page }) => {
    const getLastPatch = await mockSessionAndTemplates(page);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();

    await page.getByLabel("Company").fill("Acme Inspections");
    await expect(page.getByText("Acme Inspections")).toBeVisible();
    await expect.poll(() => (getLastPatch() as { branding_config?: { company_name?: string } } | null)?.branding_config?.company_name, {
      timeout: 3000,
    }).toBe("Acme Inspections");
  });

  test("Generate PDF dispatches a report job for the outline's images", async ({ page }) => {
    await mockSessionAndTemplates(page);
    let jobBody: { job_type?: string; capture_ids?: string[] } | null = null;
    await page.route("**/api/ops/thermal/jobs", async (route) => {
      jobBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: { id: "job-1", status: "processing", job_type: "report" } }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();
    await page.getByRole("button", { name: /Generate PDF/ }).click();

    await expect.poll(() => jobBody?.job_type, { timeout: 3000 }).toBe("report");
    expect(jobBody?.capture_ids).toContain("b");
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await mockSessionAndTemplates(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});
