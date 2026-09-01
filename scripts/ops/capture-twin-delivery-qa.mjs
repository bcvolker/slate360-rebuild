/**
 * Twin web delivery + nav performance QA.
 * Usage: node scripts/ops/capture-twin-delivery-qa.mjs [baseUrl]
 *
 * Cold = new context with HTTP cache disabled.
 * Warm = new context with HTTP cache allowed (OS/proxy may already be hot).
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-web-delivery-qa");
const url = `${base}/preview/twin-metric?job=${job}`;

function collectPage(page) {
  const jsErrors = [];
  const webglErrors = [];
  page.on("pageerror", (err) => jsErrors.push(String(err)));
  page.on("console", (msg) => {
    const text = msg.text();
    if (/webgl|WEBGL|GL_INVALID|THREE.WebGLRenderer/i.test(text) && msg.type() === "error") {
      webglErrors.push(text);
    }
  });
  return { jsErrors, webglErrors };
}

async function waitGeometry(page) {
  await page.waitForFunction(
    () => {
      const api = window.__kitchenProof;
      return Boolean(api && api.timings()?.displayMs != null);
    },
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(800);
}

async function resourceWaterfall(page) {
  return page.evaluate(() => {
    return performance.getEntriesByType("resource").map((e) => ({
      name: e.name.replace(/^https?:\/\/[^/]+/, ""),
      initiator: e.initiatorType,
      start: Math.round(e.startTime),
      duration: Math.round(e.duration),
      transfer: e.transferSize,
      encoded: e.encodedBodySize,
      decoded: e.decodedBodySize,
    }));
  });
}

async function runPass(browser, { width, height, label, cacheDisabled }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: width < 500 ? 2 : 1,
  });
  const page = await context.newPage();
  const errors = collectPage(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled });
  const navStart = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const navTiming = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return n
      ? { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd) }
      : null;
  });
  const firstUseful = await page
    .waitForSelector("[data-testid='first-useful-pixel']", { timeout: 30_000, state: "attached" })
    .then(() => Date.now() - navStart)
    .catch(() => null);
  await waitGeometry(page);
  const geometryReady = Date.now() - navStart;
  await page.waitForTimeout(400);
  const api = await page.evaluate(() => {
    const p = window.__kitchenProof;
    return {
      pose: p.pose(),
      timings: p.timings(),
      delivery: p.delivery(),
      fpsGeometry: p.fps(),
    };
  });
  const islandPose = await page.evaluate(() => {
    window.__kitchenProof.setLayer("geometry");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("island");
    return window.__kitchenProof.pose();
  });
  await page.waitForTimeout(800);
  const fpsGeometry = await page.evaluate(() => window.__kitchenProof.fps());
  await page.evaluate(() => window.__kitchenProof.setLayer("reality"));
  await page.waitForTimeout(700);
  const reality = await page.evaluate((p) => ({
    jump: window.__kitchenProof.poseJump(p),
    banner: Boolean(document.querySelector("[data-testid='appearance-unavailable']")),
    fps: window.__kitchenProof.fps(),
    pose: window.__kitchenProof.pose(),
  }), islandPose);
  await page.evaluate(() => window.__kitchenProof.setLayer("hybrid"));
  await page.waitForTimeout(500);
  const hybrid = await page.evaluate((p) => ({
    jump: window.__kitchenProof.poseJump(p),
    layer: window.__kitchenProof.layer(),
    fps: window.__kitchenProof.fps(),
  }), islandPose);
  await page.evaluate(() => window.__kitchenProof.resetView());
  await page.waitForTimeout(400);
  const afterReset = await page.evaluate(() => window.__kitchenProof.pose());
  const memory = await page.evaluate(() => {
    const mem = performance.memory;
    return mem
      ? { usedMb: mem.usedJSHeapSize / 1e6, totalMb: mem.totalJSHeapSize / 1e6 }
      : null;
  });
  const marks = await page.evaluate(() =>
    performance.getEntriesByType("mark").map((m) => ({ name: m.name, start: Math.round(m.startTime) })),
  );
  const waterfall = await resourceWaterfall(page);
  await page.screenshot({
    path: path.join(outDir, `screenshots/${label}.png`),
    timeout: 60_000,
    animations: "disabled",
  });
  await page.close();
  await context.close();
  return {
    label,
    viewport: { width, height },
    cacheDisabled,
    ttfbMs: navTiming?.ttfb ?? null,
    firstUsefulMs: firstUseful,
    geometryReadyMs: geometryReady,
    appearanceMs: api.timings.appearanceMs,
    appearanceStatus: api.timings.appearanceStatus,
    fps: { geometry: fpsGeometry, reality: reality.fps, hybrid: hybrid.fps },
    modeSwitchJump: { reality: reality.jump, hybrid: hybrid.jump },
    realityBanner: reality.banner,
    hybridLayer: hybrid.layer,
    startPose: api.pose,
    afterReset,
    delivery: api.delivery,
    memory,
    marks,
    waterfall: waterfall.filter((w) => /twin-metric|geometry|thumbnail|appearance|chunk|static/.test(w.name)),
    jsErrors: [...errors.jsErrors],
    webglErrors: [...errors.webglErrors],
    displayLoadMs: api.timings.displayMs,
    navLoadMs: api.timings.navMs,
  };
}

async function main() {
  await mkdir(path.join(outDir, "screenshots"), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const desktopCold = await runPass(browser, { width: 1440, height: 900, label: "desktop-cold", cacheDisabled: true });
  const desktopWarm = await runPass(browser, { width: 1440, height: 900, label: "desktop-warm", cacheDisabled: false });
  const mobileCold = await runPass(browser, { width: 390, height: 844, label: "mobile-cold", cacheDisabled: true });
  const mobileWarm = await runPass(browser, { width: 390, height: 844, label: "mobile-warm", cacheDisabled: false });
  await browser.close();
  const report = {
    capturedAt: new Date().toISOString(),
    url,
    passes: { desktopCold, desktopWarm, mobileCold, mobileWarm },
  };
  await writeFile(path.join(outDir, "CAPTURE.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    desktopCold: summarize(desktopCold),
    desktopWarm: summarize(desktopWarm),
    mobileCold: summarize(mobileCold),
    mobileWarm: summarize(mobileWarm),
  }, null, 2));
}

function summarize(p) {
  return {
    ttfbMs: p.ttfbMs,
    firstUsefulMs: p.firstUsefulMs,
    geometryReadyMs: p.geometryReadyMs,
    appearance: p.appearanceStatus,
    fps: p.fps,
    jump: p.modeSwitchJump,
    memory: p.memory,
    jsErrors: p.jsErrors.length,
    webglErrors: p.webglErrors.length,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
