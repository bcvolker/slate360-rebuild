/**
 * Spatial project items QA screenshots (desktop + mobile).
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3018";
const outDir = path.join(process.cwd(), "docs", "qa", "spatial-items-screenshots");

const views = [
  "ask",
  "discussion",
  "voice-comment",
  "convert",
  "assign",
  "list",
  "open",
  "restricted",
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const view of views) {
    for (const vp of [
      { id: "desktop", w: 1440, h: 900 },
      { id: "mobile", w: 390, h: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      await page.goto(`${base}/preview/spatial-items?view=${view}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(outDir, `${vp.id}-${view}.png`), fullPage: false });
      await page.close();
      console.log(`${vp.id}-${view}`);
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
