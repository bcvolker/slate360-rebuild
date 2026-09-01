import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3005";
const job = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const outDir = path.join(process.cwd(), "docs/ops/twin-appearance-forensics");

async function main() {
  await mkdir(path.join(outDir, "renders"), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/preview/twin-metric?job=${job}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => Boolean(window.__kitchenProof), null, { timeout: 120_000 });
  await page.evaluate(() => {
    window.__kitchenProof.setLayer("reality");
    window.__kitchenProof.setView("inside");
    window.__kitchenProof.goStation("fridge");
  });
  await page.waitForFunction(
    () => {
      const p = window.__kitchenProof?.pose?.();
      return Boolean(p && Math.abs(p.x - 0.72) < 0.08 && Math.abs(p.z + 1.7) < 0.08);
    },
    null,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => Boolean(window.__forensics && window.__forensics.numSplats > 1000),
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(2500);
  const meta = await page.evaluate(() => ({
    forensics: window.__forensics,
    pose: window.__kitchenProof.pose(),
    fps: window.__kitchenProof.fps(),
  }));
  await page.screenshot({
    path: path.join(outDir, "renders", "D_live_hud.png"),
    timeout: 60_000,
    animations: "disabled",
  });
  const canvas = page.locator("canvas").first();
  await canvas.screenshot({
    path: path.join(outDir, "renders", "D_live_reality.png"),
    timeout: 60_000,
    animations: "disabled",
  });

  const iso = await context.newPage();
  await iso.goto(
    `${base}/preview/twin-appearance-forensics?src=${encodeURIComponent(`/preview/twin-metric/asset?job=${job}&kind=brush_x4_arkit.spz`)}&dpr=1&maxSh=3&blur=0.3&scale=1`,
    { waitUntil: "domcontentloaded", timeout: 180_000 },
  );
  await iso.waitForFunction(
    () => Boolean(window.__forensics && window.__forensics.numSplats > 1000),
    null,
    { timeout: 180_000 },
  );
  await iso.waitForTimeout(2500);
  const isoMeta = await iso.evaluate(() => window.__forensics);
  const isoCanvas = iso.locator("canvas").first();
  await isoCanvas.screenshot({
    path: path.join(outDir, "renders", "C_spz_spark.png"),
    timeout: 60_000,
    animations: "disabled",
  });
  await browser.close();

  const prev = JSON.parse(await readFile(path.join(outDir, "BROWSER_CAPTURE.json"), "utf8"));
  prev.live = { ...prev.live, ...meta };
  prev.variants.C_spz_current.forensics = isoMeta;
  prev.recapturedAt = new Date().toISOString();
  await writeFile(path.join(outDir, "BROWSER_CAPTURE.json"), JSON.stringify(prev, null, 2) + "\n");
  console.log(JSON.stringify({
    pose: meta.pose,
    liveBuf: meta.forensics?.drawingBuffer,
    liveCss: meta.forensics?.css,
    isoBuf: isoMeta?.drawingBuffer,
    isoCam: isoMeta?.cameraPosition,
    sh: [meta.forensics?.packedShDegree, meta.forensics?.meshMaxSh],
    blur: meta.forensics?.blurAmount,
    fps: meta.fps,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
