import { test, expect, type Page } from "@playwright/test";

/**
 * Audit remediation Batch 1 (docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md
 * §2) — the shell now owns mutable capture state instead of a frozen prop.
 * These specs cover the three symptoms that were previously broken and
 * confirmed via direct code read before this fix: upload requiring a manual
 * refresh, Motion's range resetting on a shell tab switch, and an edited
 * capture's metadata appearing stale after a tab round-trip. Runs against
 * /preview/thermal-v2. See thermal-v2-r1-reliability.spec.ts for
 * warmBuildIdThenGoto (SWRegistrar's one-time build-id reload).
 */

const URL = "/preview/thermal-v2";

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

test.describe("Thermal V2 audit remediation — Batch 1 shell state", () => {
  test.use({ serviceWorkers: "block" });

  test("upload finishes → the new capture appears in Library without a page reload", async ({ page }) => {
    await page.route("**/api/ops/thermal/upload", async (route) => {
      const body = route.request().postDataJSON() as { phase?: string };
      if (body?.phase === "presign") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ captureId: "new-upload-1", storagePath: "x", signedUrl: "https://example.invalid/put" }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route("https://example.invalid/put", (route) => route.fulfill({ status: 200, body: "" }));

    let refetchCount = 0;
    await page.route("**/api/ops/thermal/sessions/preview", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      refetchCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: { id: "preview", name: "Oak Ridge Roof — Preview" },
          captures: [
            { id: "a", filename: "roof-nw-01.jpeg", previewUrl: null, quality_metrics: { is_radiometric: true }, metadata: {}, anomalies: [] },
            { id: "new-upload-1", filename: "brand-new-upload.jpeg", previewUrl: null, quality_metrics: null, metadata: {}, anomalies: null },
          ],
          latestJob: null,
        }),
      });
    });

    await warmBuildIdThenGoto(page);
    // A real click (not just an assert-visible wait) before firing the
    // synthetic drop — matches thermal-v2-w1-workflow.spec.ts's already-
    // reliable pattern for this same window-level listener.
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.evaluate(() => {
      const file = new File(["fake-bytes"], "dropped.jpg", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    });

    await expect.poll(() => refetchCount, { timeout: 5000 }).toBeGreaterThan(0);
    // The whole point of Batch 1: no page.reload() call anywhere in this test,
    // yet the new capture shows up.
    await expect(page.getByTitle(/brand-new-upload\.jpeg/)).toBeVisible();
  });

  test("an edited capture's metadata survives a Library ⇄ Analyze tab round-trip", async ({ page }) => {
    await mockGrid(page);
    await page.route("**/api/ops/thermal/captures/a", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ captureId: "a", metadata: { palette: "Rainbow" } }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    const paletteSelect = page.locator('select[title="Color palette"]');
    await paletteSelect.selectOption("Rainbow");
    await page.waitForTimeout(700); // past the 600ms autosave debounce

    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    // Before Batch 1 this reseeded "Iron" (the stale prop) on remount.
    await expect(paletteSelect).toHaveValue("Rainbow");
  });

  test("Motion's in/out range survives a Deliver → Library → Deliver shell tab switch", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver", exact: true }).click();
    await page.getByRole("button", { name: "Motion", exact: true }).click();
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();

    const inHandle = page.getByTitle("Drag to set the in point");
    const track = inHandle.locator("..");
    const box = await track.boundingBox();
    if (!box) throw new Error("ruler track not found");
    await inHandle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.up();
    await expect(page.getByText("3 of 6 frames in range")).toBeVisible();

    // Leave Deliver entirely (not just the in-component ← Deliver breadcrumb —
    // that path already worked before this fix; this is the shell-level switch
    // that used to reset the range because DeliverPanel itself unmounted).
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByRole("button", { name: "Deliver", exact: true }).click();
    await page.getByRole("button", { name: "Motion", exact: true }).click();
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();

    await expect(page.getByText("3 of 6 frames in range")).toBeVisible();
  });
});
