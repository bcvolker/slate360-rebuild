import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join("docs", "qa", "spatial-portal-screenshots");

test.describe("spatial portal screenshot pack", () => {
  test("desktop and mobile sequences", async ({ page }, testInfo) => {
    fs.mkdirSync(OUT, { recursive: true });
    const project = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
    const surfaces = [
      { surface: "spatial-only", qs: "surface=spatial" },
      { surface: "multi-product", qs: "surface=multi" },
    ];
    const screens = ["home", "overview", "library", "viewer", "files", "sharing"];
    for (const { surface, qs } of surfaces) {
      for (const screen of screens) {
        await page.goto(`/preview/spatial-portal?${qs}&screen=${screen}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(250);
        const file = path.join(OUT, `${project}-${surface}-${screen}.png`);
        await page.screenshot({ path: file, fullPage: true });
      }
    }
  });
});
