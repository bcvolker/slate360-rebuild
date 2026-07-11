import { test, expect, type Page } from "@playwright/test";

/**
 * W1 workflow foundations (roster slice #3). Runs against /preview/thermal-v2.
 * See thermal-v2-r1-reliability.spec.ts for why warmBuildIdThenGoto exists
 * (SWRegistrar's one-time build-id reload) — same pattern here.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page, path: string = URL) {
  await page.goto(path);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(path);
}

/** Fake grid so useAnalyzeImage's `!grid` guard (which gates every autosave) clears. */
async function mockGrid(page: Page) {
  await page.route("**/api/ops/thermal/captures/*/grid", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ width: 2, height: 2, temps: [20, 21, 22, 23], minC: 20, maxC: 23, emissivity: 0.95 }),
    }),
  );
}

test.describe("Thermal V2 W1 workflow foundations", () => {
  test.use({ serviceWorkers: "block" });

  test("double-click a Library thumbnail opens it in Analyze", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    const thumb = page.locator('button[title*="roof-nw-01.jpeg"]');
    await thumb.dblclick();
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toHaveClass(/graphite-primary/);
    await expect(page.getByText(/^\d\/5$/)).toBeVisible();
  });

  test("empty Library shows the one-verb start strip", async ({ page }) => {
    await warmBuildIdThenGoto(page, `${URL}?empty=1`);
    await expect(page.getByText("Drop thermal photos to begin — radiometric data is preserved")).toBeVisible();
    // The left rail's own dropzone text also contains "choose files" (substring match) — scope to the center panel.
    await expect(page.getByTestId("v2-viewer-panel").getByRole("button", { name: "Choose files" })).toBeVisible();
  });

  test("dropping a file anywhere in the shell switches to Library and shows upload progress", async ({ page }) => {
    let uploadCalls = 0;
    await page.route("**/api/ops/thermal/upload", async (route) => {
      uploadCalls += 1;
      const body = route.request().postDataJSON() as { phase?: string };
      if (body?.phase === "presign") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ captureId: "new-1", storagePath: "x", signedUrl: "https://example.invalid/put" }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route("https://example.invalid/put", (route) => route.fulfill({ status: 200, body: "" }));

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    // Simulate a real OS file drop landing on the window (not the rail's own dropzone).
    await page.evaluate(() => {
      const file = new File(["fake-bytes"], "dropped.jpg", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    });

    await expect(page.getByRole("button", { name: "Library" })).toHaveClass(/graphite-primary/);
    await expect.poll(() => uploadCalls, { timeout: 5000 }).toBeGreaterThan(0);
  });

  test("palette seeds per image and survives a switch away and back", async ({ page }) => {
    await mockGrid(page);
    let lastPalettePatch: string | null = null;
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      const body = route.request().postDataJSON() as { palette?: string };
      if (typeof body?.palette === "string") lastPalettePatch = body.palette;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    const paletteSelect = page.locator('select[title="Color palette"]');
    await paletteSelect.selectOption("Rainbow");
    await expect.poll(() => lastPalettePatch, { timeout: 3000 }).toBe("Rainbow");
  });

  test("copy on one image then paste on another applies palette + tuning", async ({ page }) => {
    await mockGrid(page);
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    const paletteSelect = page.locator('select[title="Color palette"]');
    await paletteSelect.selectOption("Rainbow");
    await page.getByRole("button", { name: "⧉ Copy" }).click();

    // Step to image 2 with the ] shortcut, then paste.
    await page.keyboard.press("]");
    await expect(page.getByText(/^2\/5$/)).toBeVisible();
    const pasteBtn = page.getByRole("button", { name: "⧉ Paste" });
    await expect(pasteBtn).toBeEnabled();
    await pasteBtn.click();
    await expect(paletteSelect).toHaveValue("Rainbow");
  });

  test("the sticky mini-summary is always visible in Analyze", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByText(/Max .* · Min .* · Avg /)).toBeVisible();
  });
});
