/**
 * Slice 4 (Explore) screenshot capture. Dev server must already be running.
 * Usage: node scripts/ops/capture-vnext-slice4.mjs http://127.0.0.1:3100
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = path.join(process.cwd(), "docs/vnext/screenshots/slice-4");

const shots = [
  { file: "explore-reality-1440.png", url: "/preview/vnext/project/explore", width: 1440, height: 900, settle: 6000 },
  { file: "explore-reality-1280.png", url: "/preview/vnext/project/explore", width: 1280, height: 800, settle: 6000 },
  { file: "explore-reality-768.png", url: "/preview/vnext/project/explore", width: 768, height: 1024, settle: 6000 },
  { file: "explore-reality-390.png", url: "/preview/vnext/project/explore", width: 390, height: 844, settle: 6000 },
  { file: "explore-geometry-1280.png", url: "/preview/vnext/project/explore-geometry", width: 1280, height: 800, settle: 2500 },
  { file: "explore-360-1280.png", url: "/preview/vnext/project/explore-360", width: 1280, height: 800, settle: 5000 },
  { file: "explore-plan-1280.png", url: "/preview/vnext/project/explore-plan", width: 1280, height: 800, settle: 1500 },
  { file: "explore-thermal-1280.png", url: "/preview/vnext/project/explore-thermal", width: 1280, height: 800, settle: 1500 },
  { file: "explore-empty-1280.png", url: "/preview/vnext/project/explore-empty", width: 1280, height: 800, settle: 500 },
  { file: "explore-error-1280.png", url: "/preview/vnext/project/explore-error", width: 1280, height: 800, settle: 500 },
  { file: "explore-present-1440.png", url: "/preview/vnext/project/explore-present", width: 1440, height: 900, settle: 6000 },
  { file: "explore-present-390.png", url: "/preview/vnext/project/explore-present", width: 390, height: 844, settle: 6000 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
  });
  const overflows = [];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(shot.settle ?? 500);
    // Next dev mode can push an HMR reload to a page mid-script on that route's first-ever
    // compile (documented in e2e/vnext/global-setup.ts) — retry once if that races us here.
    let metrics;
    try {
      metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
    } catch {
      await page.waitForTimeout(1500);
      metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
    }
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      overflows.push(`${shot.file} scrollWidth=${metrics.scrollWidth} innerWidth=${metrics.innerWidth}`);
    }
    const dest = path.join(OUT, shot.file);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`wrote ${dest} (${shot.width}x${shot.height})`);
    await context.close();
  }

  await browser.close();
  if (overflows.length) {
    console.error("HORIZONTAL OVERFLOW:\n" + overflows.join("\n"));
    process.exit(1);
  }
  console.log("no horizontal overflow at required viewports");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
