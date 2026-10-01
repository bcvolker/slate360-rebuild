/**
 * Appearance-fidelity capture: Geometry first, Reality fridge/opening, view menu,
 * mobile, Hybrid, 20s walk. Usage: node scripts/ops/capture-appearance-fidelity.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-appearance-fidelity/screenshots");
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
  await page.waitForTimeout(800);
}

async function shot(page, name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false, timeout: 120_000, animations: "disabled" });
  return dest;
}

async function fpsSamples(page, ms = 1200) {
  const t0 = Date.now();
  const samples = [];
  while (Date.now() - t0 < ms) {
    samples.push(await page.evaluate(() => window.__kitchenProof?.fps?.() ?? 0));
    await page.waitForTimeout(200);
  }
  const usable = samples.filter((n) => n > 0);
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : 0;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const timings = {};

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(page);
  const at5 = Date.now() - t0;
  if (at5 < 5000) await page.waitForTimeout(5000 - at5);
  await shot(page, "01-first-useful-geometry.png");
  timings.firstUsefulMs = Date.now() - t0;
  timings.fpsGeometry = await fpsSamples(page);
  timings.gpu = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  });

  await waitAppearance(page);
  timings.appearanceReadyMs = Date.now() - t0;
  timings.api = await page.evaluate(() => window.__kitchenProof?.timings?.() ?? null);
  timings.splatStats = await page.evaluate(() => window.__kitchenProof?.splatStats?.() ?? null);
  timings.dpr = await page.evaluate(() => window.devicePixelRatio);

  await page.evaluate(() => {
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.goStation("fridge");
  });
  await page.waitForTimeout(900);
  await shot(page, "02-reality-fridge.png");
  const poseFridge = await page.evaluate(() => window.__kitchenProof.pose());
  timings.fpsReality = await fpsSamples(page, 1500);
  timings.poseFridge = poseFridge;

  await page.evaluate(() => window.__kitchenProof.goStation("opening"));
  await page.waitForTimeout(800);
  await shot(page, "03-reality-opening.png");

  await page.evaluate(() => {
    window.__kitchenProof.setChromeIdle(false);
    window.__kitchenProof.openViewMenu();
  });
  await page.waitForTimeout(400);
  await shot(page, "04-view-menu.png");
  await page.evaluate(() => window.__kitchenProof.closeMenus());

  await page.evaluate(() => {
    window.__kitchenProof.goStation("island");
    window.__kitchenProof.setLayer("geometry");
  });
  const poseGeo = await page.evaluate(() => window.__kitchenProof.pose());
  await page.evaluate(() => window.__kitchenProof.setLayer("reality"));
  timings.modeJumpRealityM = await page.evaluate((p) => window.__kitchenProof.poseJump(p), poseGeo);
  await page.evaluate(() => window.__kitchenProof.setLayer("hybrid"));
  timings.modeJumpHybridM = await page.evaluate((p) => window.__kitchenProof.poseJump(p), poseGeo);
  timings.fpsHybrid = await fpsSamples(page);
  await shot(page, "05-hybrid-island.png");

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
    api.setLayer("reality");
    api.goStation("hero");
    await new Promise((r) => setTimeout(r, 1500));
    api.walkToStation("fridge");
    await new Promise((r) => setTimeout(r, 5500));
    api.goStation("fridge");
    await new Promise((r) => setTimeout(r, 1800));
    api.walkToStation("opening");
    await new Promise((r) => setTimeout(r, 7000));
    const before = api.pose();
    api.setLayer("geometry");
    await new Promise((r) => setTimeout(r, 2000));
    const techJump = api.poseJump(before);
    api.setLayer("reality");
    await new Promise((r) => setTimeout(r, 2200));
    const realityJump = api.poseJump(before);
    return { techJump, realityJump, stats: api.splatStats?.() ?? null };
  });
  timings.walk = walk;
  const videoPath = await rpage.video()?.path();
  await rpage.close();
  await rec.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mpage = await mobile.newPage();
  await mpage.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitGeometry(mpage);
  await waitAppearance(mpage);
  await mpage.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.goStation("fridge");
  });
  await mpage.waitForTimeout(800);
  await shot(mpage, "06-mobile-viewer.png");
  timings.mobileSplatStats = await mpage.evaluate(() => window.__kitchenProof?.splatStats?.() ?? null);
  timings.fpsMobileReality = await fpsSamples(mpage, 1000);
  await mpage.close();
  await mobile.close();
  await browser.close();

  if (videoPath) {
    const dest = path.join(outDir, "kitchen-appearance-walk.webm");
    try {
      await rename(videoPath, dest);
      timings.recording = dest;
    } catch {
      timings.recording = videoPath;
    }
  }

  await writeFile(
    path.join(outDir, "..", "CAPTURE.json"),
    JSON.stringify(timings, null, 2) + "\n",
  );
  console.log(JSON.stringify(timings, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
