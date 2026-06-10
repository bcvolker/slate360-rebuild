#!/usr/bin/env node
/**
 * Measure capture-v2 chrome geometry in DevCaptureCanvasSandbox via Playwright.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-capture-chrome.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const path = "/dev/screens?screen=capture&device=mobile";
const THUMB_COUNTS = [0, 1, 5, 12];

async function measureThumbCount(page, thumbCount) {
  const url = `${baseUrl}${path}&thumbs=${thumbCount}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { timeout: 30_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-capture-chrome="shutter"]', { timeout: 30_000 });
  await page.waitForTimeout(600);

  return page.evaluate((count) => {
    const frame =
      document.querySelector('[data-dev-device="mobile"]') ??
      document.querySelector('[data-capture-canvas="no-plans"]');
    const shutter = document.querySelector('[data-capture-chrome="shutter"]');
    const ghost = document.querySelector('[data-capture-chrome="ghost-button"]');
    const end = document.querySelector('[data-capture-chrome="end-button"]');
    const filmstrip = document.querySelector('[data-capture-chrome="filmstrip"]');
    if (!frame || !shutter || !ghost || !end || !filmstrip) return null;

    const frameRect = frame.getBoundingClientRect();
    const viewportCenterX = frameRect.left + frameRect.width / 2;
    const shutterRect = shutter.getBoundingClientRect();
    const ghostRect = ghost.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    const filmstripRect = filmstrip.getBoundingClientRect();
    const centerX = (rect) => rect.left + rect.width / 2;
    const centerY = (rect) => rect.top + rect.height / 2;

    return {
      thumbCount: count,
      viewportWidth: frameRect.width,
      viewportCenterX,
      shutterCenterX: centerX(shutterRect),
      shutterCenterDeltaX: centerX(shutterRect) - viewportCenterX,
      filmstripBottomY: filmstripRect.bottom,
      shutterTopY: shutterRect.top,
      filmstripToShutterGapPx: shutterRect.top - filmstripRect.bottom,
      ghostCenterY: centerY(ghostRect),
      endCenterY: centerY(endRect),
      shutterCenterY: centerY(shutterRect),
      ghostToShutterCenterDeltaY: centerY(ghostRect) - centerY(shutterRect),
      endToShutterCenterDeltaY: centerY(endRect) - centerY(shutterRect),
    };
  }, thumbCount);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });

    const results = [];
    for (const count of THUMB_COUNTS) {
      const sample = await measureThumbCount(page, count);
      if (!sample) {
        console.error(`[measure-capture-chrome] Missing chrome nodes for ${count} thumbs`);
        process.exit(1);
      }
      results.push(sample);
    }

    console.log(
      JSON.stringify({ baseUrl, path, viewport: { width: 390, height: 844 }, results }, null, 2),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-capture-chrome] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

main();
