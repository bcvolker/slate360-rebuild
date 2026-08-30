/**
 * Capture Spatial Walkthrough navigation HUD screenshots.
 * Usage: node scripts/ops/capture-spatial-nav.mjs [baseUrl] [houseWalkSharePath]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const houseWalk = process.argv[3] || process.env.HOUSEWALK_SHARE_PATH || "";
const outDir = path.join(process.cwd(), ".spatial-nav-review");

const preview = [
  { id: "desktop-explore", scene: "explore", width: 1440, height: 900 },
  { id: "desktop-play", scene: "play", width: 1440, height: 900 },
  { id: "desktop-picker", scene: "picker", width: 1440, height: 900 },
  { id: "desktop-pin", scene: "pin", width: 1440, height: 900 },
  { id: "desktop-route-hud", scene: "route", width: 1440, height: 900 },
  { id: "desktop-transition", scene: "transition", width: 1440, height: 900 },
  { id: "desktop-share", scene: "share", width: 1440, height: 900 },
  { id: "desktop-aerial", scene: "aerial", width: 1440, height: 900 },
  { id: "mobile-explore", scene: "explore", width: 390, height: 844 },
  { id: "mobile-play", scene: "play-mobile", width: 390, height: 844 },
  { id: "mobile-picker", scene: "picker-mobile", width: 390, height: 844 },
  { id: "mobile-pin", scene: "pin-mobile", width: 390, height: 844 },
  { id: "mobile-route-hud", scene: "route-mobile", width: 390, height: 844 },
  { id: "mobile-transition", scene: "transition-mobile", width: 390, height: 844 },
  { id: "mobile-share", scene: "share-mobile", width: 390, height: 844 },
  { id: "mobile-aerial", scene: "aerial-mobile", width: 390, height: 844 },
];

async function shot(page, dest) {
  await page.screenshot({ path: dest, fullPage: false });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const paths = [];
  const notes = [];

  for (const item of preview) {
    const page = await browser.newPage({ viewport: { width: item.width, height: item.height } });
    await page.goto(`${base}/preview/spatial-nav?scene=${item.scene}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(600);
    if (item.scene.includes("share")) {
      const btn = page.getByRole("button", { name: /Share current view/i });
      if (await btn.count()) await btn.first().click();
      await page.waitForTimeout(300);
    }
    const dest = path.join(outDir, `${item.id}.png`);
    await shot(page, dest);
    paths.push(dest);
    await page.close();
  }

  if (houseWalk) {
    for (const vp of [
      { id: "housewalk-desktop", width: 1440, height: 900 },
      { id: "housewalk-mobile", width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const url = houseWalk.startsWith("http") ? houseWalk : `${base}${houseWalk}`;
      try {
        const res = await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
        await page.waitForTimeout(1500);
        const enter = page.getByRole("button", { name: /Enter Walkthrough/i });
        if (await enter.count()) {
          await enter.first().click({ force: true });
          await page.waitForTimeout(4000);
        }
        await page.mouse.move(240, 200);
        await page.waitForTimeout(400);
        const dest = path.join(outDir, `${vp.id}.png`);
        await shot(page, dest);
        paths.push(dest);
        notes.push({ id: vp.id, status: res?.status() ?? 0, url });
      } catch (err) {
        notes.push({ id: vp.id, error: String(err), url });
      }
      await page.close();
    }
  } else {
    notes.push({ id: "housewalk", skipped: "Pass HOUSEWALK_SHARE_PATH=/w/{token} for the real capture." });
  }

  await browser.close();
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ base, houseWalk: houseWalk || null, paths, notes }, null, 2));
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
