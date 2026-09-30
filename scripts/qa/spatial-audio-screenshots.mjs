/**
 * HouseWalk audio QA screenshots (desktop + mobile).
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3018";
const outDir = path.join(process.cwd(), "docs", "qa", "spatial-audio-screenshots");

const shots = [
  { id: "desktop-briefing", view: "briefing", w: 1440, h: 900 },
  { id: "desktop-transcript", view: "transcript", w: 1440, h: 900 },
  { id: "desktop-voice-pin", view: "voice-pin", w: 1440, h: 900 },
  { id: "desktop-timeline", view: "timeline", w: 1440, h: 900 },
  { id: "desktop-controls", view: "controls", w: 1440, h: 900 },
  { id: "mobile-briefing", view: "briefing", w: 390, h: 844 },
  { id: "mobile-transcript", view: "transcript", w: 390, h: 844 },
  { id: "mobile-voice-pin", view: "voice-pin", w: 390, h: 844 },
  { id: "mobile-controls", view: "controls", w: 390, h: 844 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  for (const item of shots) {
    const page = await browser.newPage({ viewport: { width: item.w, height: item.h } });
    await page.goto(`${base}/preview/spatial-audio?view=${item.view}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (item.view === "transcript") {
      await page.getByRole("button", { name: "Transcript" }).first().click().catch(() => undefined);
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, `${item.id}.png`), fullPage: false });
    await page.close();
    console.log(item.id);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
