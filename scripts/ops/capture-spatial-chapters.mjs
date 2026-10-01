/**
 * Capture Spatial Walkthrough chapter / long-capture screenshots.
 * Usage: node scripts/ops/capture-spatial-chapters.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "docs", "qa", "spatial-chapters-screenshots");

const shots = [
  { id: "entire-walk", scene: "entire-walk", width: 1440, height: 900 },
  { id: "chapter-picker", scene: "picker", width: 1440, height: 900 },
  { id: "level-1", scene: "level-1", width: 1440, height: 900 },
  { id: "room", scene: "room", width: 1440, height: 900 },
  { id: "multi-clip-transition", scene: "transition", width: 1440, height: 900 },
  { id: "mobile-chapter-picker", scene: "picker-mobile", width: 390, height: 844 },
  { id: "space-library", scene: "library", width: 1440, height: 900 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const paths = [];
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(`${base}/preview/spatial-chapters?scene=${shot.scene}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(500);
    const dest = path.join(outDir, `${shot.id}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    paths.push(dest);
    await page.close();
  }
  await browser.close();
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ base, paths }, null, 2));
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
