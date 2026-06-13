#!/usr/bin/env node
/**
 * Capture real app screens (the 390x844 device frame only) from /dev/screens
 * sandboxes into public/marketing/demo/ for the homepage phone walkthroughs.
 *
 * Usage: dev server on 127.0.0.1:3000, then `node scripts/ops/screenshot-marketing-demo.mjs`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = "public/marketing/demo";

const FAKE_MEDIA_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];

const SHOTS = [
  { name: "site-walk-1-capture", url: "/dev/screens?screen=capture&device=mobile&mode=captured&thumbs=2" },
  { name: "site-walk-2-pin", url: "/dev/screens?screen=capture&device=mobile&mode=captured&popover=open&thumbs=2" },
  { name: "site-walk-3-details", url: "/dev/screens?screen=note-review&device=mobile" },
  { name: "site-walk-4-review", url: "/dev/screens?screen=walk-review&device=mobile" },
  // Twin capture recording needs a live camera headless can't reliably supply
  // (renders blank), and the upload/viewer sandboxes carry dev "mock" labels —
  // so the demo uses the two screens that render clean, deterministic UI.
  { name: "twin-1-record", url: "/dev/screens?screen=twin-review&device=mobile" },
  { name: "twin-2-ghost", url: "/dev/screens?screen=twin-wizard&device=mobile" },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: FAKE_MEDIA_ARGS });
  const context = await browser.newContext({
    viewport: { width: 480, height: 1000 },
    deviceScaleFactor: 2,
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  // Warm pass: force dev compile of every screen before capturing.
  for (const shot of SHOTS) {
    await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => {});
  }

  for (const shot of SHOTS) {
    await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForSelector('[data-dev-device="mobile"]', { state: "visible", timeout: 90_000 });
    // Styled-render guard: the dev frame must have a dark canvas background.
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-dev-device="mobile"]');
      if (!el) return false;
      const bg = getComputedStyle(el).backgroundColor;
      return bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)";
    }, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const frame = page.locator('[data-dev-device="mobile"]');
    await frame.scrollIntoViewIfNeeded();
    await frame.screenshot({ path: `${OUT_DIR}/${shot.name}.png` });
    console.log(`${shot.name} -> ${OUT_DIR}/${shot.name}.png`);
  }

  await browser.close();
}

void main().catch((error) => {
  console.error(`[marketing-demo] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
