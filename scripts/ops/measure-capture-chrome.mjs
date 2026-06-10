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

    const sheet = document.querySelector('[data-capture-chrome="source-picker-sheet"]');
    const firstRow = document.querySelector('[data-capture-chrome="source-picker-row"]');
    const sheetRect = sheet?.getBoundingClientRect();
    const rowRect = firstRow?.getBoundingClientRect();
    const sheetStyle = sheet ? window.getComputedStyle(sheet) : null;
    const bottomPad = sheetStyle ? Number.parseFloat(sheetStyle.paddingBottom || "0") : null;

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
      sourcePickerOpen: Boolean(sheet),
      sourcePickerHeightPx: sheetRect?.height ?? null,
      sourcePickerRowHeightPx: rowRect?.height ?? null,
      sourcePickerBottomPadPx: bottomPad,
      shutterCenterDeltaXWithPicker: sheet ? centerX(shutterRect) - viewportCenterX : null,
    };
  }, thumbCount);
}

async function measureSourcePicker(page) {
  const url = `${baseUrl}${path}&thumbs=0&picker=open&photo360=locked`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { timeout: 30_000 });
  await page.waitForSelector('[data-capture-chrome="source-picker-sheet"]', { timeout: 30_000 });
  await page.waitForSelector('[data-capture-chrome="shutter"]', { timeout: 30_000 });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const frame =
      document.querySelector('[data-dev-device="mobile"]') ??
      document.querySelector('[data-capture-canvas="no-plans"]');
    const shutter = document.querySelector('[data-capture-chrome="shutter"]');
    const sheet = document.querySelector('[data-capture-chrome="source-picker-sheet"]');
    const firstRow = document.querySelector('[data-capture-chrome="source-picker-row"]');
    if (!frame || !shutter || !sheet || !firstRow) return null;

    const frameRect = frame.getBoundingClientRect();
    const shutterRect = shutter.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const rowRect = firstRow.getBoundingClientRect();
    const sheetStyle = window.getComputedStyle(sheet);
    const bottomPad = Number.parseFloat(sheetStyle.paddingBottom || "0");
    const viewportCenterX = frameRect.left + frameRect.width / 2;
    const shutterCenterX = shutterRect.left + shutterRect.width / 2;

    return {
      viewportWidth: frameRect.width,
      viewportHeight: frameRect.height,
      shutterCenterDeltaX: shutterCenterX - viewportCenterX,
      sourcePickerOpen: true,
      sourcePickerHeightPx: sheetRect.height,
      sourcePickerRowHeightPx: rowRect.height,
      sourcePickerBottomPadPx: bottomPad,
      sourcePickerSnapRatio: sheetRect.height / frameRect.height,
      shutterCenterDeltaXWithPicker: shutterCenterX - viewportCenterX,
    };
  });
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

    const pickerSample = await measureSourcePicker(page);

    console.log(
      JSON.stringify(
        { baseUrl, path, viewport: { width: 390, height: 844 }, results, pickerSample },
        null,
        2,
      ),
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
