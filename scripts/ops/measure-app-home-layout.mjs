#!/usr/bin/env node
/**
 * Measure /app home layout at 390×844 — launcher tiles, quick actions, SlateDrop portal.
 *
 * Usage:
 *   npx next start --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-app-home-layout.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const route = "/preview/app-home-layout";
const outDir = path.join(process.cwd(), "tmp-app-home-measure");

async function rect(page, selector) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return null;
  return el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  });
}

function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

async function measureFrame(page, count) {
  const frameSel = `[data-testid="app-home-frame-${count}"]`;
  await page.locator(frameSel).scrollIntoViewIfNeeded();

  const header = await rect(page, `${frameSel} [data-testid="mock-mobile-header"]`);
  const sectionLabel = await rect(page, `${frameSel} [data-testid="mobile-section-label"]`);
  const launcher = await rect(page, `${frameSel} [data-testid^="launcher-layout"]`);
  const quickActions = await rect(page, `${frameSel} [data-testid="mobile-quick-action-strip"]`);
  const slateDrop = await rect(page, `${frameSel} [data-testid="slatedrop-portal-card"]`);
  const dock = await rect(page, `${frameSel} [data-testid="mobile-expandable-panel-frame"]`);
  const bottomNav = await rect(page, `${frameSel} [data-testid="mock-mobile-bottom-nav"]`);
  const tiles = await page.locator(`${frameSel} a[aria-label^="Open "]`).evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return {
        label: node.getAttribute("aria-label"),
        height: Math.round(r.height),
        width: Math.round(r.width),
      };
    }),
  );

  const pairs = [
    [sectionLabel, launcher],
    [launcher, quickActions],
    [quickActions, slateDrop],
    [slateDrop, dock],
    [dock, bottomNav],
  ];

  const overlapPairs = pairs
    .filter(([a, b]) => overlaps(a, b))
    .map(([a, b]) => ({ aTop: a?.top, bTop: b?.top }));

  return {
    count,
    headerBottomY: header?.bottom ?? null,
    yourAppsTopY: sectionLabel?.top ?? null,
    launcherBottomY: launcher?.bottom ?? null,
    quickActionsBottomY: quickActions?.bottom ?? null,
    slateDropBottomY: slateDrop?.bottom ?? null,
    dockTopY: dock?.top ?? null,
    dockHeight: dock?.height ?? null,
    bottomNavTopY: bottomNav?.top ?? null,
    gapDockToNav: bottomNav && dock ? bottomNav.top - dock.bottom : null,
    tileHeights: tiles.map((t) => t.height),
    tileWidths: tiles.map((t) => t.width),
    overlaps: overlapPairs,
  };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 900, height: 2000 },
      deviceScaleFactor: 2,
    });

    const url = `${baseUrl}${route}`;
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    if (!response?.ok()) {
      console.error(`[measure] Failed to load ${url} (${response?.status()})`);
      process.exit(1);
    }

    await page.waitForSelector('[data-testid="app-home-frame-3"]', { timeout: 60_000 });
    await page.waitForTimeout(500);

    const shotPath = path.join(outDir, "app-home-layout-390x844.png");
    const frame = page.locator('[data-testid="app-home-frame-3"]');
    await frame.scrollIntoViewIfNeeded();
    await frame.screenshot({ path: shotPath });

    const three = await measureFrame(page, 3);
    const five = await measureFrame(page, 5);

    const report = {
      baseUrl,
      route,
      viewport: { width: 390, height: 844 },
      screenshot: shotPath,
      threeApp: three,
      fiveApp: five,
      pass:
        three.overlaps.length === 0 &&
        five.overlaps.length === 0 &&
        three.tileHeights.every((h) => h >= 70 && h <= 78) &&
        five.tileHeights.every((h) => h >= 70 && h <= 78),
    };

    const reportPath = path.join(outDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (!report.pass) process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

main();
