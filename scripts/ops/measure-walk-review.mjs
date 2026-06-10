#!/usr/bin/env node
/**
 * Measure capture-v2 Walk Review layout in DevWalkReviewSandbox via Playwright.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-walk-review.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const path = "/dev/screens?screen=walk-review&device=mobile&frameW=390&frameH=844";
const STOP_COUNTS = [2, 8, 40];
const VARIANTS = ["quick", "project"];

async function measureVariant(page, stopCount, variant) {
  const url = `${baseUrl}${path}&stops=${stopCount}&variant=${variant}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { timeout: 30_000 });
  await page.waitForSelector('[data-walk-review="grid"]', { timeout: 30_000 });
  await page.waitForSelector('[data-walk-review="actions"]', { timeout: 30_000 });
  await page.waitForTimeout(600);

  return page.evaluate(
    ({ count, walkVariant }) => {
      const frame = document.querySelector('[data-dev-device="mobile"]');
      const grid = document.querySelector('[data-walk-review="grid"]');
      const actions = document.querySelector('[data-walk-review="actions"]');
      const scroll = document.querySelector('[data-walk-review="grid-scroll"]');
      const cards = Array.from(document.querySelectorAll('[data-walk-review="stop-card"]'));
      if (!frame || !grid || !actions || !scroll) return null;

      const frameRect = frame.getBoundingClientRect();
      const gridStyle = window.getComputedStyle(grid);
      const gridGapPx = Number.parseFloat(gridStyle.gap || gridStyle.rowGap || "0");
      const firstCardRect = cards[0]?.getBoundingClientRect();
      const secondCardRect = cards[1]?.getBoundingClientRect();
      const thirdCardRect = cards[2]?.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      const rowGapPx =
        firstCardRect && thirdCardRect
          ? Math.round(thirdCardRect.top - firstCardRect.bottom)
          : firstCardRect && secondCardRect
            ? Math.round(secondCardRect.top - firstCardRect.top)
            : null;

      return {
        stopCount: count,
        variant: walkVariant,
        viewportWidth: frameRect.width,
        viewportHeight: frameRect.height,
        gridGapPx,
        rowGapPx,
        scrollToActionsGapPx: Math.round(actionsRect.top - scrollRect.bottom),
        overlapPx: scrollRect.bottom - actionsRect.top,
        attachVisible: Boolean(
          actions.querySelector("button")?.textContent?.toLowerCase().includes("attach"),
        ),
      };
    },
    { count: stopCount, walkVariant: variant },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const results = [];

  for (const stopCount of STOP_COUNTS) {
    for (const variant of VARIANTS) {
      const sample = await measureVariant(page, stopCount, variant);
      if (!sample) {
        console.error(`[measure-walk-review] Missing nodes for ${stopCount} stops / ${variant}`);
        process.exitCode = 1;
        continue;
      }
      results.push(sample);
      console.log(JSON.stringify(sample));
    }
  }

  await browser.close();

  const failures = results.filter(
    (sample) =>
      sample.overlapPx > 1 ||
      sample.gridGapPx !== 8 ||
      (sample.variant === "quick" && !sample.attachVisible) ||
      (sample.variant === "project" && sample.attachVisible),
  );

  if (failures.length > 0) {
    console.error(`[measure-walk-review] Layout checks failed for ${failures.length} sample(s)`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[measure-walk-review] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
