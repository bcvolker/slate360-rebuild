/**
 * Slice 4 short interaction recording: switches through every Explore representation,
 * then enters and exits presentation mode. Dev server must already be running.
 * Usage: node scripts/ops/record-vnext-slice4.mjs http://127.0.0.1:3100
 */
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT_DIR = path.join(process.cwd(), "docs/vnext/screenshots/slice-4");
const OUT_FILE = "explore-interaction.webm";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/preview/vnext/project/explore`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);

  for (const rep of ["geometry", "360", "plan", "thermal"]) {
    await page.locator(`[data-vnext-rep-option='${rep}']`).click();
    await page.waitForTimeout(1800);
  }

  await page.locator(`[data-vnext-rep-option='reality']`).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Present" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Exit presentation" }).click();
  await page.waitForTimeout(1000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const recordedPath = await video.path();
    const dest = path.join(OUT_DIR, OUT_FILE);
    await rename(recordedPath, dest);
    console.log(`wrote ${dest}`);
  }

  // Clean up any other .webm Playwright left behind in the output dir from this run.
  const files = await readdir(OUT_DIR);
  for (const file of files) {
    if (file.endsWith(".webm") && file !== OUT_FILE) {
      console.log(`(leftover, not the final recording) ${file}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
