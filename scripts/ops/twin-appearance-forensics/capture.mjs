/**
 * Capture live Reality (D) + isolated Spark A/B variants at the locked fridge camera.
 * Usage: node scripts/ops/twin-appearance-forensics/capture.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3005";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-appearance-forensics");
const liveUrl = `${base}/preview/twin-metric?job=${job}`;

function isolatedUrl(params) {
  const q = new URLSearchParams(params);
  return `${base}/preview/twin-appearance-forensics?${q.toString()}`;
}

async function waitSplat(page, timeout = 180_000) {
  await page.waitForFunction(
    () => {
      const f = window.__forensics;
      return Boolean(f && f.numSplats && f.numSplats > 1000);
    },
    null,
    { timeout },
  );
  await page.waitForTimeout(2500);
}

async function dump(page) {
  return page.evaluate(() => {
    const f = window.__forensics || null;
    const p = window.__kitchenProof || null;
    return {
      forensics: f,
      pose: p ? p.pose() : null,
      appearanceReady: p ? p.appearanceReady() : null,
      fps: p ? p.fps() : null,
    };
  });
}

async function shot(page, name) {
  const dest = path.join(outDir, "renders", `${name}.png`);
  await page.screenshot({ path: dest, timeout: 60_000, animations: "disabled" });
  return dest;
}

async function openIsolated(browser, params, name) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: Number(params.dpr || 1),
  });
  const page = await context.newPage();
  await page.goto(isolatedUrl(params), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitSplat(page);
  const meta = await dump(page);
  await shot(page, name);
  await page.close();
  await context.close();
  return meta;
}

async function main() {
  await mkdir(path.join(outDir, "renders"), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });

  const liveCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const live = await liveCtx.newPage();
  await live.goto(liveUrl, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await live.waitForFunction(() => Boolean(window.__kitchenProof), null, { timeout: 120_000 });
  await live.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("fridge");
  });
  await live.waitForFunction(
    () => {
      const p = window.__kitchenProof?.pose?.();
      return Boolean(p && Math.abs(p.x - 0.72) < 0.08 && Math.abs(p.z + 1.7) < 0.08);
    },
    null,
    { timeout: 30_000 },
  );
  await waitSplat(live);
  const liveMeta = await dump(live);
  await shot(live, "D_live_reality");
  await live.close();
  await liveCtx.close();

  const spz = `/preview/twin-metric/asset?job=${job}&kind=brush_x4_arkit.spz`;
  const ply = `/preview/twin-appearance-forensics/asset?kind=brush_x4_arkit.ply`;
  const native = `/preview/twin-appearance-forensics/asset?kind=brush_b.ply`;

  const variants = {};
  variants.C_spz_current = await openIsolated(browser, { src: spz, dpr: "1", maxSh: "3", blur: "0.3", scale: "1" }, "C_spz_spark");
  variants.A_dpr2 = await openIsolated(browser, { src: spz, dpr: "2", maxSh: "3", blur: "0.3", scale: "1" }, "AB_dpr2");
  variants.B_small_scale = await openIsolated(browser, { src: spz, dpr: "1", maxSh: "3", blur: "0.3", scale: "0.7" }, "AB_scale07");
  variants.D_sh3 = await openIsolated(browser, { src: spz, dpr: "1", maxSh: "3", blur: "0", scale: "1" }, "AB_blur0");
  variants.E_aces = await openIsolated(browser, { src: spz, dpr: "1", maxSh: "3", blur: "0.3", scale: "1", tonemap: "aces" }, "AB_aces");
  variants.F_ply = await openIsolated(browser, { src: ply, dpr: "1", maxSh: "3", blur: "0.3", scale: "1" }, "G_arkit_ply_spark");
  variants.G_sh0 = await openIsolated(browser, { src: spz, dpr: "1", maxSh: "0", blur: "0.3", scale: "1" }, "AB_sh0");
  variants.H_native_sim3 = await openIsolated(
    browser,
    { src: native, dpr: "1", maxSh: "3", blur: "0.3", scale: "1", sim3: "1" },
    "A_native_ply_spark_sim3",
  );

  await browser.close();
  const report = { capturedAt: new Date().toISOString(), live: liveMeta, variants };
  await writeFile(path.join(outDir, "BROWSER_CAPTURE.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    liveDrawing: liveMeta.forensics?.drawingBuffer,
    liveDpr: liveMeta.forensics?.dpr,
    liveSh: [liveMeta.forensics?.packedShDegree, liveMeta.forensics?.meshMaxSh],
    liveSplats: liveMeta.forensics?.numSplats,
    liveBlur: liveMeta.forensics?.blurAmount,
    liveCss: liveMeta.forensics?.css,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
