/**
 * Capture Brush kitchen-proof screenshots + a short walk recording.
 * Usage: node scripts/ops/capture-kitchen-proof.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-brush-visual-proof/screenshots");
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
  await page.waitForTimeout(1200);
}

async function shot(page, name) {
  await page.waitForTimeout(400);
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false, timeout: 120_000, animations: "disabled" });
  return dest;
}

async function fpsSamples(page, ms = 1200) {
  const t0 = Date.now();
  const samples = [];
  while (Date.now() - t0 < ms) {
    samples.push(await page.evaluate(() => window.__kitchenProof?.fps?.() ?? 0));
    await page.waitForTimeout(250);
  }
  const usable = samples.filter((n) => n > 0);
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : 0;
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
  await waitGeometry(page);
  timings.geometryReadyMs = Date.now() - t0;
  timings.fpsGeometry = await fpsSamples(page);
  await waitAppearance(page);
  timings.appearanceReadyMs = Date.now() - t0;
  timings.api = await page.evaluate(() => window.__kitchenProof?.timings?.() ?? null);
  timings.memoryMb = timings.api?.memoryMb ?? null;

  await page.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
    window.__kitchenProof.setLayer("reality");
  });
  await page.waitForTimeout(800);
  await shot(page, "01-reality-island.png");
  timings.fpsReality = await fpsSamples(page);

  await page.evaluate(() => window.__kitchenProof.goStation("fridge"));
  await page.waitForTimeout(700);
  await shot(page, "02-reality-fridge.png");

  await page.evaluate(() => window.__kitchenProof.goStation("opening"));
  await page.waitForTimeout(700);
  await shot(page, "03-reality-arch.png");

  await page.evaluate(() => {
    window.__kitchenProof.goStation("island");
    window.__kitchenProof.setLayer("geometry");
  });
  await page.waitForTimeout(700);
  const poseGeometry = await page.evaluate(() => window.__kitchenProof.pose());
  await shot(page, "04-geometry-island.png");

  await page.evaluate(() => window.__kitchenProof.setLayer("hybrid"));
  await page.waitForTimeout(700);
  const poseHybrid = await page.evaluate(() => window.__kitchenProof.pose());
  timings.modeJumpHybridM = await page.evaluate((p) => window.__kitchenProof.poseJump(p), poseGeometry);
  await shot(page, "05-hybrid-island.png");
  timings.fpsHybrid = await fpsSamples(page);

  await page.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.setView("dollhouse");
  });
  await page.waitForTimeout(900);
  await shot(page, "06-dollhouse.png");
  timings.modeJumpGeometryM = await page.evaluate((p) => window.__kitchenProof.poseJump(p), poseHybrid);

  await page.close();
  await desktop.close();

  const rec = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
  });
  const rpage = await rec.newPage();
  await rpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(rpage);
  await waitAppearance(rpage);
  const walk = await rpage.evaluate(async () => {
    const api = window.__kitchenProof;
    api.setView("inside");
    api.goStation("island");
    api.setLayer("reality");
    await new Promise((r) => setTimeout(r, 1800));
    api.walkToStation("fridge");
    await new Promise((r) => setTimeout(r, 7000));
    api.walkToStation("opening");
    await new Promise((r) => setTimeout(r, 8000));
    const before = api.pose();
    api.setLayer("hybrid");
    await new Promise((r) => setTimeout(r, 2500));
    const hybridJump = api.poseJump(before);
    api.setLayer("geometry");
    await new Promise((r) => setTimeout(r, 2500));
    const geometryJump = api.poseJump(before);
    api.walkToStation("island");
    await new Promise((r) => setTimeout(r, 6000));
    return { hybridJump, geometryJump, after: api.pose() };
  });
  timings.walk = walk;
  const videoPath = await rpage.video()?.path();
  await rpage.close();
  await rec.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(mpage);
  await waitAppearance(mpage);
  await mpage.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
  });
  await shot(mpage, "07-mobile-reality.png");
  await mpage.close();
  await mobile.close();
  await browser.close();

  if (videoPath) {
    const dest = path.join(outDir, "kitchen-brush-walk.webm");
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
