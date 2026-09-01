/**
 * Probe live Reality splat stats after appearance is ready.
 * Usage: node scripts/ops/probe-appearance-stats.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://127.0.0.1:3000";
const url = `${base}/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`;

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
await page.waitForFunction(() => window.__kitchenProof?.appearanceReady?.() === true, null, {
  timeout: 180_000,
});
await page.waitForTimeout(1500);
const out = await page.evaluate(() => ({
  stats: window.__kitchenProof?.splatStats?.() ?? null,
  fps: window.__kitchenProof?.fps?.() ?? null,
  layer: window.__kitchenProof?.layer?.() ?? null,
  timings: window.__kitchenProof?.timings?.() ?? null,
}));
console.log(JSON.stringify(out, null, 2));
await browser.close();
