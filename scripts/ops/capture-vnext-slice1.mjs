/**
 * Slice 1 screenshot capture. Dev server must already be running.
 * Usage: node scripts/ops/capture-vnext-slice1.mjs http://127.0.0.1:3011
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3011";
const OUT = path.join(process.cwd(), "docs/vnext/screenshots/slice-1");

const shots = [
  { file: "client-1440.png", url: "/preview/vnext/client", width: 1440, height: 900 },
  { file: "client-1280.png", url: "/preview/vnext/client", width: 1280, height: 800 },
  { file: "client-768.png", url: "/preview/vnext/client", width: 768, height: 1024 },
  { file: "client-390.png", url: "/preview/vnext/client", width: 390, height: 844 },
  { file: "owner-1440.png", url: "/preview/vnext/owner", width: 1440, height: 900 },
  { file: "owner-1280.png", url: "/preview/vnext/owner", width: 1280, height: 800 },
  { file: "owner-768.png", url: "/preview/vnext/owner", width: 768, height: 1024 },
  { file: "owner-390.png", url: "/preview/vnext/owner", width: 390, height: 844 },
  {
    file: "owner-drawer-390.png",
    url: "/preview/vnext/owner-menu",
    width: 390,
    height: 844,
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const overflows = [];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(300);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
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
