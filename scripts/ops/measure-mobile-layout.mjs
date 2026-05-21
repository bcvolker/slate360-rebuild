#!/usr/bin/env node
/**
 * Measure /app and /site-walk mobile shell geometry via Playwright.
 *
 * Usage:
 *   npx next start --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-mobile-layout.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const path = "/preview/mobile-shell-layout";

async function rect(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
    };
  });
}

async function measureSurface(page, surface) {
  const rootSel = `[data-measure-surface="${surface}"]`;
  await page.locator(rootSel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const header = await rect(page, `${rootSel} [data-testid="mock-mobile-header"]`);
  const bottomNav = await rect(page, `${rootSel} [data-testid="mock-mobile-bottom-nav"]`);
  const dockFrame = await rect(page, `${rootSel} [data-testid="mobile-expandable-panel-frame"]`);

  if (surface === "app") {
    const sectionLabel = await rect(page, `${rootSel} [data-testid="mobile-section-label"]`);
    const quickStrip = await rect(page, `${rootSel} [data-testid="mobile-quick-action-strip"]`);
    return {
      headerBottomY: header.bottom,
      yourAppsLabelTopY: sectionLabel.top,
      topGapHeaderToContent: sectionLabel.top - header.bottom,
      quickActionBottomY: quickStrip.bottom,
      dockTopY: dockFrame.top,
      dockBottomY: dockFrame.bottom,
      bottomNavTopY: bottomNav.top,
      gapDockToNav: bottomNav.top - dockFrame.bottom,
    };
  }

  const moduleIntro = await rect(page, `${rootSel} [data-testid="site-walk-module-intro"]`);
  const actionGrid = await rect(page, `${rootSel} [data-testid="site-walk-action-grid"]`);

  return {
    headerBottomY: header.bottom,
    moduleTitleTopY: moduleIntro.top,
    topGapHeaderToContent: moduleIntro.top - header.bottom,
    actionGridBottomY: actionGrid.bottom,
    dockTopY: dockFrame.top,
    dockBottomY: dockFrame.bottom,
    bottomNavTopY: bottomNav.top,
    gapDockToNav: bottomNav.top - dockFrame.bottom,
  };
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });

    const url = `${baseUrl}${path}`;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (!response?.ok()) {
      console.error(`[measure] Failed to load ${url} (${response?.status()})`);
      process.exit(1);
    }

    await page.waitForSelector('[data-testid="mobile-app-button"]', { timeout: 30_000 });
    await page.waitForSelector('[data-testid="site-walk-action-grid"] button', { timeout: 30_000 });

    const app = await measureSurface(page, "app");
    const siteWalk = await measureSurface(page, "site-walk");

    console.log(JSON.stringify({ baseUrl, path, viewport: { width: 390, height: 844 }, app, siteWalk }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

main();
