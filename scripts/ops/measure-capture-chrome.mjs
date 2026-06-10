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
const SHUTTER_HINT_GAP_MAX = 16;

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function measureThumbCount(page, thumbCount) {
  const url = `${baseUrl}${path}&thumbs=${thumbCount}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[data-capture-canvas="no-plans"]', { state: "attached", timeout: 90_000 });
  await page.waitForSelector('[data-capture-chrome="shutter"]', { state: "attached", timeout: 90_000 });

  if (thumbCount > 0) {
    const toggle = page.locator('[data-capture-chrome="filmstrip-toggle"]');
    if (await toggle.count()) {
      await toggle.click({ force: true });
      await page.waitForSelector('[data-capture-chrome="filmstrip-toggle"][aria-expanded="true"]', {
        timeout: 10_000,
      });
    }
  }

  await page.waitForTimeout(600);

  return page.evaluate((count) => {
    const frame =
      document.querySelector('[data-dev-device="mobile"]') ??
      document.querySelector('[data-capture-canvas="no-plans"]');
    const shutter = document.querySelector('[data-capture-chrome="shutter"]');
    const ghost = document.querySelector('[data-capture-chrome="ghost-button"]');
    const end = document.querySelector('[data-capture-chrome="end-button"]');
    const filmstrip = document.querySelector('[data-capture-chrome="filmstrip"]');
    const topBar = document.querySelector('[data-capture-chrome="top-bar"]');
    const hint = document.querySelector('[data-capture-chrome="hint"]');
    if (!frame || !shutter || !ghost || !end || !filmstrip || !topBar || !hint) return null;

    const frameRect = frame.getBoundingClientRect();
    const rel = (rect) => ({
      top: rect.top - frameRect.top,
      bottom: rect.bottom - frameRect.top,
      left: rect.left - frameRect.left,
      right: rect.right - frameRect.left,
    });
    const viewportCenterX = frameRect.width / 2;
    const shutterRel = rel(shutter.getBoundingClientRect());
    const ghostRel = rel(ghost.getBoundingClientRect());
    const endRel = rel(end.getBoundingClientRect());
    const filmstripRect = rel(filmstrip.getBoundingClientRect());
    const topBarRect = rel(topBar.getBoundingClientRect());
    const hintRect = rel(hint.getBoundingClientRect());
    const light = document.querySelector('[data-capture-chrome="light-button"]');
    const centerX = (rect) => rect.left + (rect.right - rect.left) / 2;
    const centerY = (rect) => rect.top + (rect.bottom - rect.top) / 2;

    const nodes = [
      { id: "shutter", rect: shutterRel },
      { id: "ghost", rect: ghostRel },
      { id: "end", rect: endRel },
      { id: "hint", rect: hintRect },
      light && { id: "light", rect: rel(light.getBoundingClientRect()) },
    ].filter(Boolean);

    const overlapPairs = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        if (
          a.rect.left < b.rect.right &&
          a.rect.right > b.rect.left &&
          a.rect.top < b.rect.bottom &&
          a.rect.bottom > b.rect.top
        ) {
          overlapPairs.push(`${a.id}×${b.id}`);
        }
      }
    }

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
      shutterCenterX: centerX(shutterRel),
      shutterCenterDeltaX: centerX(shutterRel) - viewportCenterX,
      topBarBottomY: topBarRect.bottom,
      filmstripTopY: filmstripRect.top,
      filmstripBottomY: filmstripRect.bottom,
      shutterTopY: shutterRel.top,
      shutterBottomY: shutterRel.bottom,
      hintTopY: hintRect.top,
      filmstripUnderTopBar: filmstripRect.top >= topBarRect.top - 1 && filmstripRect.top < frameRect.height * 0.35,
      shutterToHintGapPx: Math.round(hintRect.top - shutterRel.bottom),
      ghostCenterY: centerY(ghostRel),
      endCenterY: centerY(endRel),
      shutterCenterY: centerY(shutterRel),
      ghostToShutterCenterDeltaY: centerY(ghostRel) - centerY(shutterRel),
      endToShutterCenterDeltaY: centerY(endRel) - centerY(shutterRel),
      overlapPairs,
      lightButtonPresent: Boolean(light),
      sourcePickerOpen: Boolean(sheet),
      sourcePickerHeightPx: sheetRect?.height ?? null,
      sourcePickerRowHeightPx: rowRect?.height ?? null,
      sourcePickerBottomPadPx: bottomPad,
      shutterCenterDeltaXWithPicker: sheet ? centerX(shutterRel) - viewportCenterX : null,
    };
  }, thumbCount);
}

function assertSample(sample) {
  const failures = [];
  if (Math.abs(sample.shutterCenterDeltaX) > 2) {
    failures.push(`thumbs=${sample.thumbCount} shutter off-center by ${sample.shutterCenterDeltaX.toFixed(1)}px`);
  }
  if (!sample.filmstripUnderTopBar) {
    failures.push(`thumbs=${sample.thumbCount} filmstrip not under top bar`);
  }
  if (sample.filmstripBottomY > sample.shutterTopY - 8) {
    failures.push(`thumbs=${sample.thumbCount} filmstrip overlaps shutter band`);
  }
  if (sample.shutterToHintGapPx > SHUTTER_HINT_GAP_MAX) {
    failures.push(
      `thumbs=${sample.thumbCount} shutter-to-hint gap ${sample.shutterToHintGapPx}px exceeds ${SHUTTER_HINT_GAP_MAX}px`,
    );
  }
  if (sample.overlapPairs.length > 0) {
    failures.push(`thumbs=${sample.thumbCount} overlaps: ${sample.overlapPairs.join(", ")}`);
  }
  return failures;
}

async function measureSourcePicker(page) {
  const url = `${baseUrl}${path}&thumbs=0&picker=open&photo360=locked`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[data-capture-canvas="no-plans"]', { state: "attached", timeout: 90_000 });
  await page.waitForSelector('[data-capture-chrome="source-picker-sheet"]', { timeout: 30_000 });
  await page.waitForSelector('[data-capture-chrome="shutter"]', { state: "attached", timeout: 90_000 });
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

async function measurePinPopover(page) {
  const url = `${baseUrl}${path}&mode=captured&popover=open&thumbs=1`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector('[data-capture-canvas="no-plans"]', { state: "attached", timeout: 90_000 });
  await page.waitForSelector('[data-capture-chrome="pin-popover"]', { timeout: 30_000 });
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const frame =
      document.querySelector('[data-dev-device="mobile"]') ??
      document.querySelector('[data-capture-canvas="no-plans"]');
    const popover = document.querySelector('[data-capture-chrome="pin-popover"]');
    const actionRows = Array.from(document.querySelectorAll('[data-capture-chrome="pin-action-row"]'));
    const closeButton = document.querySelector('[data-capture-chrome="pin-popover-close"]');
    const labelInput = document.querySelector('[data-capture-chrome="pin-label-input"]');
    if (!frame || !popover) return null;

    const frameRect = frame.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const rowHeights = actionRows.map((row) => row.getBoundingClientRect().height);
    const closeRect = closeButton?.getBoundingClientRect();
    const labelRect = labelInput?.getBoundingClientRect();
    const withinViewport =
      popoverRect.left >= frameRect.left - 1 &&
      popoverRect.right <= frameRect.right + 1 &&
      popoverRect.top >= frameRect.top - 1 &&
      popoverRect.bottom <= frameRect.bottom + 1;

    return {
      viewportWidth: frameRect.width,
      viewportHeight: frameRect.height,
      cardWidthPx: Math.round(popoverRect.width),
      cardLeftPx: Math.round(popoverRect.left - frameRect.left),
      cardRightPx: Math.round(popoverRect.right - frameRect.left),
      cardTopPx: Math.round(popoverRect.top - frameRect.top),
      cardBottomPx: Math.round(popoverRect.bottom - frameRect.top),
      withinViewport,
      minActionRowHeightPx: rowHeights.length > 0 ? Math.min(...rowHeights) : 0,
      minCloseTapPx: closeRect ? Math.min(closeRect.width, closeRect.height) : 0,
      minLabelTapPx: labelRect ? Math.min(labelRect.width, labelRect.height) : 0,
    };
  });
}

function assertPinPopover(sample) {
  const failures = [];
  const MIN_TAP_PX = 44;
  const CARD_WIDTH_TARGET = 280;
  if (!sample.withinViewport) failures.push("pin popover overflows viewport");
  if (Math.abs(sample.cardWidthPx - CARD_WIDTH_TARGET) > 6) {
    failures.push(`pin popover width ${sample.cardWidthPx}px expected ~${CARD_WIDTH_TARGET}px`);
  }
  if (sample.minActionRowHeightPx > 0 && sample.minActionRowHeightPx < MIN_TAP_PX) {
    failures.push(`pin action row height ${sample.minActionRowHeightPx}px below ${MIN_TAP_PX}px`);
  }
  if (sample.minCloseTapPx > 0 && sample.minCloseTapPx < MIN_TAP_PX) {
    failures.push(`pin close tap ${sample.minCloseTapPx}px below ${MIN_TAP_PX}px`);
  }
  if (sample.minLabelTapPx > 0 && sample.minLabelTapPx < MIN_TAP_PX) {
    failures.push(`pin label tap ${sample.minLabelTapPx}px below ${MIN_TAP_PX}px`);
  }
  return failures;
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
    const failures = [];
    for (const count of THUMB_COUNTS) {
      const sample = await measureThumbCount(page, count);
      if (!sample) {
        console.error(`[measure-capture-chrome] Missing chrome nodes for ${count} thumbs`);
        process.exit(1);
      }
      results.push(sample);
      failures.push(...assertSample(sample));
    }

    if (failures.length > 0) {
      console.error(`[measure-capture-chrome] layout failures: ${failures.join("; ")}`);
      process.exit(1);
    }

    const pickerSample = await measureSourcePicker(page);
    const popoverSample = await measurePinPopover(page);
    if (!popoverSample) {
      console.error("[measure-capture-chrome] Missing pin popover nodes");
      process.exit(1);
    }
    const popoverFailures = assertPinPopover(popoverSample);
    if (popoverFailures.length > 0) {
      console.error(`[measure-capture-chrome] popover failures: ${popoverFailures.join("; ")}`);
      process.exit(1);
    }

    console.log(
      JSON.stringify(
        { baseUrl, path, viewport: { width: 390, height: 844 }, results, pickerSample, popoverSample },
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
