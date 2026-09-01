/**
 * Capture twin-viewer-unblock-v2 screenshots + walkthrough recording.
 * Usage: node scripts/ops/capture-twin-unblock.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-viewer-unblock-v2/screenshots");
const url = `${base}/preview/twin-metric?job=${job}`;

async function waitReady(page) {
  await page.waitForFunction(
    () => Boolean(window.__kitchenProof) && document.querySelector("canvas"),
    null,
    { timeout: 180_000 },
  );
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading geometry"),
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(4000);
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outDir, name),
    fullPage: false,
    timeout: 120_000,
    animations: "disabled",
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const timings = {};
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitReady(page);
  timings.gotoMs = Date.now() - t0;
  timings.glb = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource");
    const hit = entries.find((e) => e.name.includes("geometry-display.glb"));
    return hit
      ? { downloadMs: hit.duration, transferSize: hit.transferSize, encoded: hit.encodedBodySize }
      : null;
  });
  await page.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
  });
  await page.waitForTimeout(1200);
  timings.fpsGeometry = await page.evaluate(() => window.__kitchenProof?.fps?.() ?? null);
  const islandPose = await page.evaluate(() => window.__kitchenProof.pose());
  await shot(page, "01-geometry-island.png");

  await page.evaluate(() => window.__kitchenProof.setLayer("reality"));
  await page.waitForTimeout(800);
  timings.modeSwitchJump = await page.evaluate((p) => window.__kitchenProof.poseJump(p), islandPose);
  timings.realityStatus = await page.evaluate(
    () => Boolean(document.querySelector('[data-testid="appearance-unavailable"]')),
  );
  await page.evaluate(() => window.__kitchenProof.setLayer("geometry"));

  await page.evaluate(() => window.__kitchenProof.goStation("fridge"));
  await page.waitForTimeout(700);
  await shot(page, "02-geometry-fridge.png");

  await page.evaluate(() => window.__kitchenProof.goStation("opening"));
  await page.waitForTimeout(700);
  await shot(page, "03-walk-through-arch.png");

  const rec = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
  });
  const rpage = await rec.newPage();
  await rpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitReady(rpage);
  await rpage.evaluate(async () => {
    const api = window.__kitchenProof;
    api.setView("inside");
    api.setLayer("geometry");
    api.goStation("island");
    await new Promise((r) => setTimeout(r, 1500));
    api.goStation("fridge");
    await new Promise((r) => setTimeout(r, 1800));
    api.goStation("opening");
    await new Promise((r) => setTimeout(r, 1800));
    api.setLayer("reality");
    await new Promise((r) => setTimeout(r, 1200));
    api.setLayer("geometry");
    await new Promise((r) => setTimeout(r, 800));
    api.goStation("island");
    await new Promise((r) => setTimeout(r, 1800));
  });
  const videoPath = await rpage.video()?.path();
  await rpage.close();
  await rec.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitReady(mpage);
  await mpage.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
  });
  await shot(mpage, "08-mobile-inside.png");
  await mpage.close();
  await mobile.close();

  await page.close();
  await desktop.close();
  await browser.close();

  if (videoPath) {
    const dest = path.join(outDir, "twin-walkthrough-proof.webm");
    try {
      await rename(videoPath, dest);
      timings.recording = dest;
    } catch {
      timings.recording = videoPath;
    }
  }
  await writeFile(
    path.join(outDir, "..", "CAPTURE_TIMINGS.json"),
    JSON.stringify(timings, null, 2) + "\n",
  );
  console.log(JSON.stringify(timings, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
