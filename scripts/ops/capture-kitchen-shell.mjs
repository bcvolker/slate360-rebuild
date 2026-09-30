/**
 * Capture commercial Twin viewer-shell screenshots.
 * Usage: node scripts/ops/capture-kitchen-shell.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3006";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-viewer-shell/screenshots");
const url = `${base}/preview/twin-metric?job=${job}`;

async function waitGeometry(page) {
  await page.waitForFunction(
    () => Boolean(window.__kitchenProof) && document.querySelector("canvas"),
    null,
    { timeout: 180_000 },
  );
}

async function waitAppearance(page) {
  await page.waitForFunction(() => window.__kitchenProof?.appearanceReady?.() === true, null, {
    timeout: 180_000,
  });
  await page.waitForTimeout(600);
}

async function shot(page, name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false, timeout: 120_000, animations: "disabled" });
  return dest;
}

async function sampleCanvasBg(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const root = document.querySelector("[data-app='twin360']") || document.body;
    const bg = getComputedStyle(root).backgroundColor;
    return { bg, hasCanvas: Boolean(canvas), w: canvas?.width ?? 0, h: canvas?.height ?? 0 };
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const notes = { samples: [] };

  const cold = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cpage = await cold.newPage();
  const t0 = Date.now();
  const pending = cpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  for (const ms of [500, 2000, 5000, 10000]) {
    const remain = ms - (Date.now() - t0);
    if (remain > 0) await cpage.waitForTimeout(remain);
    try {
      notes.samples.push({ ms, ...(await sampleCanvasBg(cpage)) });
    } catch {
      notes.samples.push({ ms, bg: "unavailable", hasCanvas: false });
    }
    await shot(cpage, `cold-${String(ms).padStart(5, "0")}ms.png`);
  }
  await pending.catch(() => null);
  await cpage.close();
  await cold.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(page);
  await waitAppearance(page);
  await page.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("hero");
    window.__kitchenProof.setLayer("reality");
  });
  await page.waitForTimeout(2800);
  await shot(page, "01-desktop-idle.png");

  await page.mouse.move(200, 200);
  await page.waitForTimeout(250);
  await shot(page, "02-desktop-chrome-active.png");

  await page.evaluate(() => window.__kitchenProof.openViewMenu());
  await page.waitForTimeout(250);
  await shot(page, "03-desktop-view-menu.png");
  await page.evaluate(() => window.__kitchenProof.closeMenus());

  await page.evaluate(() => {
    window.__kitchenProof.goStation("hero");
    window.__kitchenProof.setLayer("reality");
  });
  await page.waitForTimeout(400);
  await shot(page, "04-desktop-reality.png");

  await page.evaluate(() => {
    window.__kitchenProof.goStation("hero");
    window.__kitchenProof.setLayer("geometry");
  });
  await page.waitForTimeout(400);
  await shot(page, "05-desktop-geometry.png");

  await page.evaluate(() => window.__kitchenProof.setView("dollhouse"));
  await page.waitForTimeout(700);
  await shot(page, "06-desktop-dollhouse.png");

  await page.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("hero");
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.closeMenus();
    window.__kitchenProof.toggleMeasure();
  });
  await page.waitForTimeout(400);
  await shot(page, "07-desktop-tools-measure.png");
  await page.close();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(mpage);
  await waitAppearance(mpage);
  await mpage.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("hero");
    window.__kitchenProof.setLayer("reality");
  });
  await mpage.waitForTimeout(2800);
  await shot(mpage, "08-mobile-default.png");
  await mpage.mouse.move(40, 780);
  await mpage.click('[data-testid="kitchen-view"]');
  await mpage.waitForTimeout(300);
  await shot(mpage, "09-mobile-view-sheet.png");
  await mpage.click('[data-testid="kitchen-view"]');
  await mpage.evaluate(() => window.__kitchenProof.walkToStation("fridge"));
  await mpage.waitForTimeout(2500);
  await shot(mpage, "10-mobile-navigating.png");
  await mpage.close();
  await mobile.close();
  await browser.close();

  await writeFile(path.join(outDir, "..", "CAPTURE.json"), JSON.stringify(notes, null, 2) + "\n");
  console.log(JSON.stringify(notes, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
