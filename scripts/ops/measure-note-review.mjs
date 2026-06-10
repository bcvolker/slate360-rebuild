#!/usr/bin/env node
/**
 * Measure capture-v2 Note / Review layout in DevNoteReviewSandbox via Playwright.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-note-review.mjs
 *   node scripts/ops/measure-note-review.mjs --keyboard=280
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const keyboardArg = process.argv.find((arg) => arg.startsWith("--keyboard="));
const keyboardSim = keyboardArg ? Number.parseInt(keyboardArg.split("=")[1] ?? "", 10) : 0;

async function measure(page, keyboard) {
  const query = keyboard > 0 ? `&keyboard=${keyboard}` : "";
  const url = `${baseUrl}/dev/screens?screen=note-review&device=mobile${query}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector('[data-note-review="screen"]', { timeout: 30_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(keyboard > 0 ? 400 : 200);

  if (keyboard > 0) {
    await page.getByTestId("note-review-field").click();
  }

  return page.evaluate(() => {
    const screen = document.querySelector('[data-note-review="screen"]');
    const topBar = document.querySelector('[data-note-review="top-bar"]');
    const angleStrip = document.querySelector('[data-note-review="angle-strip"]');
    const scroll = document.querySelector('[data-note-review="scroll"]');
    const accessory = document.querySelector('[data-note-review="note-accessory"]');
    const actionBar = document.querySelector('[data-note-review="action-bar"]');
    const noteField = document.querySelector('[data-testid="note-review-field"]');
    if (!screen || !topBar || !scroll || !accessory || !actionBar || !noteField) return null;

    const screenRect = screen.getBoundingClientRect();
    const rects = {
      topBar: topBar.getBoundingClientRect(),
      angleStrip: angleStrip?.getBoundingClientRect() ?? null,
      scroll: scroll.getBoundingClientRect(),
      accessory: accessory.getBoundingClientRect(),
      actionBar: actionBar.getBoundingClientRect(),
      noteField: noteField.getBoundingClientRect(),
    };

    const round = (rect) =>
      rect
        ? {
            top: Math.round(rect.top - screenRect.top),
            bottom: Math.round(rect.bottom - screenRect.top),
            left: Math.round(rect.left - screenRect.left),
            right: Math.round(rect.right - screenRect.left),
            height: Math.round(rect.height),
            width: Math.round(rect.width),
          }
        : null;

    const gap = (a, b) => (a && b ? Math.round(b.top - a.bottom) : null);

    return {
      frame: {
        width: Math.round(screenRect.width),
        height: Math.round(screenRect.height),
      },
      keyboardOffset: Number(screen.getAttribute("data-keyboard-offset") ?? 0),
      keyboardSim: Number(new URLSearchParams(window.location.search).get("keyboard") ?? 0),
      rects: {
        topBar: round(rects.topBar),
        angleStrip: round(rects.angleStrip),
        scroll: round(rects.scroll),
        accessory: round(rects.accessory),
        actionBar: round(rects.actionBar),
        noteField: round(rects.noteField),
      },
      gaps: {
        topBarToAngleStrip: gap(rects.topBar, rects.angleStrip),
        angleStripToScroll: gap(rects.angleStrip, rects.scroll),
        topBarToScroll: gap(rects.topBar, rects.scroll),
        scrollToAccessory: gap(rects.scroll, rects.accessory),
        accessoryToAction: gap(rects.accessory, rects.actionBar),
        actionBarToFrameBottom: Math.round(screenRect.bottom - rects.actionBar.bottom),
        noteFieldToAccessory: gap(rects.noteField, rects.accessory),
      },
      actionBarCenterDeltaX:
        Math.round(rects.actionBar.left + rects.actionBar.width / 2) -
        Math.round(screenRect.left + screenRect.width / 2),
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

    const keyboardClosed = await measure(page, 0);
    const keyboardOpen = keyboardSim > 0 ? await measure(page, keyboardSim) : null;

    if (!keyboardClosed) {
      console.error("[measure-note-review] Missing layout nodes (keyboard closed)");
      process.exit(1);
    }

    console.log(JSON.stringify({ keyboardClosed, keyboardOpen }, null, 2));
  } finally {
    await browser?.close();
  }
}

void main();
