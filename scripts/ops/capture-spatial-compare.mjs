/**
 * Capture Spatial Walkthrough temporal compare screenshots.
 * Usage: node scripts/ops/capture-spatial-compare.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3022";
const outDir = path.join(process.cwd(), "docs", "qa", "spatial-compare-screenshots");

const shots = [
  { id: "desktop-split", scene: "split", width: 1440, height: 900 },
  { id: "desktop-swipe", scene: "swipe", width: 1440, height: 900 },
  { id: "desktop-overlay", scene: "overlay", width: 1440, height: 900 },
  { id: "desktop-flip", scene: "flip", width: 1440, height: 900 },
  { id: "desktop-authoring", scene: "author", width: 1440, height: 900 },
  { id: "mobile-flip", scene: "flip-mobile", width: 390, height: 844 },
  { id: "mobile-swipe", scene: "swipe-mobile", width: 390, height: 844 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const paths = [];
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(`${base}/preview/spatial-compare?scene=${shot.scene}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(400);
    if (shot.scene === "author") {
      const match = page.getByRole("button", { name: /match this view/i });
      if (await match.count()) await match.click({ force: true });
    }
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
