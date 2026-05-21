#!/usr/bin/env node
/**
 * Layout measurement for mobile expandable panels (/app + /site-walk).
 * Requires Playwright: npx playwright install chromium (once).
 *
 * Usage:
 *   node scripts/ops/measure-expandable-panel-layout.mjs
 *   PLAYWRIGHT_BASE_URL=https://www.slate360.ai node scripts/ops/measure-expandable-panel-layout.mjs
 */

import { chromium, devices } from "playwright";

const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100").replace(
  /\/$/,
  "",
);

const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
];

const ROUTES = [
  { path: "/app", label: "/app" },
  { path: "/site-walk", label: "/site-walk" },
];

async function measureRoute(page, route, viewport) {
  const url = `${baseURL}${route.path}`;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const loginRedirect = page.url().includes("/login");
  if (loginRedirect) {
    return {
      route: route.label,
      viewport: viewport.name,
      skipped: true,
      reason: "redirected to login — run against authenticated session or local dev",
    };
  }

  const frame = page.locator('[data-testid="mobile-expandable-panel-frame"]').first();
  const nav = page.locator('nav[aria-label="Primary"]').first();

  const hasFrame = (await frame.count()) > 0;
  if (!hasFrame) {
    return {
      route: route.label,
      viewport: viewport.name,
      skipped: true,
      reason: "panel frame not found in DOM",
    };
  }

  const frameBox = await frame.boundingBox();
  const navBox = await nav.count() ? await nav.boundingBox() : null;
  const rootScroll =
    (await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)) ??
    false;

  const gap =
    frameBox && navBox ? Math.round(navBox.y - (frameBox.y + frameBox.height)) : null;

  return {
    route: route.label,
    viewport: viewport.name,
    bottomNavTopY: navBox ? Math.round(navBox.y) : null,
    collapsedPanelBottomY: frameBox ? Math.round(frameBox.y + frameBox.height) : null,
    gapPx: gap,
    collapsedPanelHeightPx: frameBox ? Math.round(frameBox.height) : null,
    rootPageScrolls: rootScroll,
    panelBodyScrollable: await frame
      .locator('[data-slot="tabs-content"]')
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return style.overflowY === "auto" || style.overflowY === "scroll";
      })
      .catch(() => null),
  };
}

async function measureExpanded(page, route, viewport) {
  const url = `${baseURL}${route.path}`;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (page.url().includes("/login")) return null;

  const expandBtn = page
    .getByRole("button", { name: /Expand (activity panel|panel)/i })
    .first();
  if ((await expandBtn.count()) === 0) return null;

  const frame = page.locator('[data-testid="mobile-expandable-panel-frame"]').first();
  const collapsedH = (await frame.boundingBox())?.height ?? 0;

  await expandBtn.click();
  await page.waitForTimeout(250);

  const expandedBox = await frame.boundingBox();
  const nav = page.locator('nav[aria-label="Primary"]').first();
  const navBox = (await nav.count()) ? await nav.boundingBox() : null;

  return {
    route: route.label,
    viewport: viewport.name,
    collapsedHeightPx: Math.round(collapsedH),
    expandedHeightPx: expandedBox ? Math.round(expandedBox.height) : null,
    expandedLarger: expandedBox ? expandedBox.height > collapsedH + 40 : null,
    gapPx:
      expandedBox && navBox
        ? Math.round(navBox.y - (expandedBox.y + expandedBox.height))
        : null,
    bottomNavVisible: navBox ? navBox.y < viewport.height : null,
  };
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    console.log(
      "[measure-expandable-panel] SKIPPED: Playwright chromium not available.",
      error instanceof Error ? error.message : error,
    );
    process.exit(0);
  }

  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "en-US",
  });
  const page = await context.newPage();

  console.log(`\n[measure-expandable-panel] Base URL: ${baseURL}\n`);

  const collapsed = [];
  const expanded = [];

  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      collapsed.push(await measureRoute(page, route, viewport));
      const exp = await measureExpanded(page, route, viewport);
      if (exp) expanded.push(exp);
    }
  }

  console.log("=== Collapsed ===");
  console.log(JSON.stringify(collapsed, null, 2));
  console.log("\n=== Expanded ===");
  console.log(JSON.stringify(expanded, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error("[measure-expandable-panel] FAILED:", error);
  process.exit(1);
});
