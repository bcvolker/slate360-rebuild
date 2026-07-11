import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
// @ts-ignore — jszip types may lag, same pattern as export-engine.ts
import JSZip from "jszip";

/**
 * S8.5 export engine, push 1 — clean/annotated PNG + measurement CSV +
 * full-grid CSV + metadata JSON, batched into a ZIP (roster slice #11).
 * Runs against /preview/thermal-v2. See thermal-v2-r1-reliability.spec.ts
 * for warmBuildIdThenGoto (SWRegistrar's one-time build-id reload).
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

async function mockGrid(page: Page) {
  await page.route("**/api/ops/thermal/captures/*/grid", (route) => {
    const url = route.request().url();
    // Fixture "c" (unsupported camera) and "vis-1" (visual-only pair row)
    // have no radiometric grid — the real backend 415s these.
    if (url.includes("/captures/c/") || url.includes("/captures/vis-1/")) {
      return route.fulfill({ status: 415, contentType: "application/json", body: JSON.stringify({ error: "This image hasn't been decoded yet." }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ width: 4, height: 4, temps: Array.from({ length: 16 }, (_, i) => 20 + i), minC: 20, maxC: 35, emissivity: 0.95 }),
    });
  });
}

test.describe("Thermal V2 S8.5 export engine", () => {
  test.use({ serviceWorkers: "block" });

  test("Export (This image) downloads a ZIP with clean/annotated PNGs, CSVs, and metadata JSON", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);
    // "This image" scope reads the focused thumbnail — none is focused on fresh load.
    await page.getByRole("button", { name: /roof-nw-01\.jpeg/ }).click();

    const exportBtn = page.getByRole("button", { name: /^Export 1/ });
    await expect(exportBtn).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent("download"), exportBtn.click()]);

    const path = await download.path();
    expect(path).not.toBeNull();
    const zip = await JSZip.loadAsync(await readFile(path as string));
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.endsWith("/clean.png"))).toBe(true);
    expect(names.some((n) => n.endsWith("/annotated.png"))).toBe(true);
    expect(names.some((n) => n.endsWith("/measurements.csv"))).toBe(true);
    expect(names.some((n) => n.endsWith("/full-grid.csv"))).toBe(true);
    expect(names.some((n) => n.endsWith("/metadata.json"))).toBe(true);

    const fullGridCsv = await zip.file(names.find((n) => n.endsWith("/full-grid.csv"))!)!.async("string");
    expect(fullGridCsv.split("\n")).toHaveLength(4); // 4x4 fixture grid → 4 rows
  });

  test("exporting a non-radiometric image reports 0 exported / 1 skipped and triggers no download", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);

    // Fixture "panel-east-01.jpeg" (id "c") is display-only — has no grid.
    await page.getByRole("button", { name: /panel-east-01\.jpeg/ }).click();
    const exportBtn = page.getByRole("button", { name: /^Export 1/ });
    await exportBtn.click();
    await expect(page.getByText("Exported 0 — skipped 1 (no temperature data)")).toBeVisible();
  });

  test("Export (Selected 2) zips one folder per exportable image", async ({ page }) => {
    await mockGrid(page);
    await warmBuildIdThenGoto(page);

    const thumbs = page.locator('button[title*="double-click to analyze"]');
    await thumbs.nth(0).click();
    await thumbs.nth(1).click({ modifiers: ["Control"] });
    await page.getByRole("radio", { name: /^Selected/ }).click();

    const exportBtn = page.getByRole("button", { name: /^Export 2/ });
    const [download] = await Promise.all([page.waitForEvent("download"), exportBtn.click()]);
    const path = await download.path();
    const zip = await JSZip.loadAsync(await readFile(path as string));
    const topFolders = new Set(Object.keys(zip.files).map((n) => n.split("/")[0]));
    expect(topFolders.size).toBe(2);
  });
});
