/**
 * Headed FPS probe for kitchen Brush proof. Usage: node scripts/ops/probe-kitchen-fps.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://127.0.0.1:3005";
const url = `${base}/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`;

async function sampleFps(page, ms = 2500) {
  const t0 = Date.now();
  const samples = [];
  while (Date.now() - t0 < ms) {
    samples.push(await page.evaluate(() => window.__kitchenProof?.fps?.() ?? 0));
    await page.waitForTimeout(200);
  }
  const usable = samples.filter((n) => n > 1);
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : 0;
}

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
await page.waitForFunction(() => Boolean(window.__kitchenProof) && document.querySelector("canvas"), null, {
  timeout: 180_000,
});
const geometryReadyMs = Date.now() - t0;
await page.evaluate(() => {
  window.__kitchenProof.setLayer("geometry");
  window.__kitchenProof.setView("inside");
  window.__kitchenProof.goStation("island");
});
await page.waitForTimeout(800);
const fpsGeometry = await sampleFps(page);
await page.waitForFunction(() => window.__kitchenProof?.appearanceReady?.() === true, null, { timeout: 180_000 });
const appearanceReadyMs = Date.now() - t0;
await page.evaluate(() => window.__kitchenProof.setLayer("reality"));
await page.waitForTimeout(800);
const fpsReality = await sampleFps(page);
await page.evaluate(() => window.__kitchenProof.setLayer("hybrid"));
await page.waitForTimeout(800);
const fpsHybrid = await sampleFps(page);
const timings = await page.evaluate(() => window.__kitchenProof.timings());
const pose = await page.evaluate(() => window.__kitchenProof.pose());
await browser.close();
const out = { geometryReadyMs, appearanceReadyMs, fpsGeometry, fpsReality, fpsHybrid, timings, pose };
console.log(JSON.stringify(out, null, 2));
