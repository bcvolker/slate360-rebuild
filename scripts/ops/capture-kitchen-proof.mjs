/**
 * Capture kitchen visual-proof screenshots + a short recording.
 * Usage: node scripts/ops/capture-kitchen-proof.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-kitchen-visual-proof/screenshots");
const url = `${base}/preview/twin-metric?job=${job}`;

async function waitReady(page) {
  await page.waitForFunction(
    () => Boolean(window.__kitchenProof) && document.querySelector("canvas"),
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(12000);
}

async function shot(page, name) {
  await page.waitForTimeout(1500);
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false, timeout: 120_000, animations: "disabled" });
  return dest;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const timings = {};

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktop.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitReady(page);
  timings.gotoMs = Date.now() - t0;
  const glb = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource");
    const hit = entries.find((e) => e.name.includes("geometry-web.glb") || e.name.includes("geometry.glb"));
    return hit
      ? { downloadMs: hit.duration, transferSize: hit.transferSize, encoded: hit.encodedBodySize }
      : null;
  });
  timings.glb = glb;
  timings.fpsGeometry = await page.evaluate(() => window.__kitchenProof?.fps?.() ?? null);

  await page.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("human");
  });
  await shot(page, "01-geometry-human-eye.png");

  await page.evaluate(() => window.__kitchenProof.setLayer("reality"));
  await page.waitForTimeout(2500);
  timings.fpsReality = await page.evaluate(() => window.__kitchenProof?.fps?.() ?? null);
  await shot(page, "02-reality-human-eye.png");

  await page.evaluate(() => window.__kitchenProof.setLayer("hybrid"));
  await shot(page, "03-hybrid-human-eye.png");

  await page.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.goStation("fridge");
  });
  await page.waitForTimeout(900);
  await shot(page, "04-refrigerator-reality.png");

  await page.evaluate(() => {
    window.__kitchenProof.setLayer("hybrid");
    window.__kitchenProof.goStation("island");
  });
  await page.waitForTimeout(900);
  await shot(page, "05-island-hybrid.png");

  await page.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.goStation("opening");
  });
  await page.waitForTimeout(900);
  await shot(page, "06-opening-geometry.png");

  await page.evaluate(() => {
    window.__kitchenProof.goStation("human");
    window.__kitchenProof.setView("dollhouse");
  });
  await page.waitForTimeout(900);
  await shot(page, "07-dollhouse.png");

  await page.evaluate(() => window.__kitchenProof.setView("floorplan"));
  await page.waitForTimeout(900);
  await shot(page, "08-plan.png");

  await page.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.toggleMeasure();
  });
  await page.waitForTimeout(900);
  await shot(page, "09-measurement.png");

  await page.close();
  await desktop.close();

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
    api.goStation("human");
    api.setLayer("reality");
    await new Promise((r) => setTimeout(r, 2500));
    api.setLayer("hybrid");
    await new Promise((r) => setTimeout(r, 2000));
    api.setLayer("geometry");
    await new Promise((r) => setTimeout(r, 2000));
    api.goStation("island");
    await new Promise((r) => setTimeout(r, 2000));
    api.setLayer("reality");
    await new Promise((r) => setTimeout(r, 2500));
  });
  const videoPath = await rpage.video()?.path();
  await rpage.close();
  await rec.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitReady(mpage);
  await mpage.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("human");
  });
  await shot(mpage, "10-mobile-reality.png");
  await mpage.close();
  await mobile.close();
  await browser.close();

  if (videoPath) {
    const dest = path.join(outDir, "kitchen-proof-recording.webm");
    const { rename } = await import("node:fs/promises");
    try {
      await rename(videoPath, dest);
      timings.recording = dest;
    } catch {
      timings.recording = videoPath;
    }
  }

  await writeFile(path.join(outDir, "..", "CAPTURE_TIMINGS.json"), JSON.stringify(timings, null, 2) + "\n");
  console.log(JSON.stringify(timings, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
