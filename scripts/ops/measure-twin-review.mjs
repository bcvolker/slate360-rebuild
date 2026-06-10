#!/usr/bin/env node
/**
 * Measure Twin 360 review screen in DevTwinReviewSandbox via Playwright.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-twin-review.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844, frameW: 390, frameH: 844, query: "" },
  {
    label: "360x800",
    width: 360,
    height: 800,
    frameW: 360,
    frameH: 800,
    query: "&frameW=360&frameH=800",
  },
];

async function measureViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const url = `${baseUrl}/dev/screens?screen=twin-review&device=mobile&credits=low&sheet=open${viewport.query}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-twin-review="screen"]', { timeout: 90_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-twin-review="credits-sheet"]', { timeout: 15_000 });
  await page.waitForTimeout(300);

  const sample = await page.evaluate((label) => {
    const screen = document.querySelector('[data-twin-review="screen"]');
    const frame = document.querySelector('[data-dev-device="mobile"]');
    const topBar = document.querySelector('[data-twin-review="top-bar"]');
    const scroll = document.querySelector('[data-twin-review="scroll"]');
    const estimate = document.querySelector('[data-twin-review="estimate"]');
    const lowCredits = document.querySelector('[data-twin-review="low-credits"]');
    const actionBar = document.querySelector('[data-twin-review="action-bar"]');
    const creditsSheet = document.querySelector('[data-twin-review="credits-sheet"]');
    if (!screen || !frame || !topBar || !scroll || !estimate || !actionBar) return null;

    const screenRect = screen.getBoundingClientRect();
    const round = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        top: Math.round(rect.top - screenRect.top),
        bottom: Math.round(rect.bottom - screenRect.top),
        left: Math.round(rect.left - screenRect.left),
        right: Math.round(rect.right - screenRect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    const rects = {
      frame: round(frame),
      topBar: round(topBar),
      scroll: round(scroll),
      estimate: round(estimate),
      lowCredits: round(lowCredits),
      actionBar: round(actionBar),
      creditsSheet: round(creditsSheet),
    };

    const gap = (a, b) => (a && b ? Math.round(b.top - a.bottom) : null);

    return {
      label,
      frameSize: {
        width: Number(frame.getAttribute("data-dev-frame-width") ?? 0),
        height: Number(frame.getAttribute("data-dev-frame-height") ?? 0),
      },
      rects,
      gaps: {
        topBarToScroll: gap(rects.topBar, rects.scroll),
        scrollToActionBar: gap(rects.scroll, rects.actionBar),
        actionBarToFrameBottom: rects.frame ? rects.frame.height - (rects.actionBar?.bottom ?? 0) : null,
        estimateToLowCredits: gap(rects.estimate, rects.lowCredits),
      },
      actionBarPinnedToFrameBottom: rects.actionBar?.bottom === rects.frame?.height,
      creditsSheetVisible: Boolean(creditsSheet),
    };
  }, viewport.label);

  await context.close();
  if (!sample) throw new Error(`Missing review nodes for ${viewport.label}`);
  return sample;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await measureViewport(browser, viewport));
    }

    console.log(JSON.stringify({ baseUrl, results }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-twin-review] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

void main();
