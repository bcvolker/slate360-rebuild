#!/usr/bin/env node
/**
 * Measure neutral shared mobile shell chrome (header + bottom nav) on /app, /site-walk, /digital-twin.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-mobile-shell-chrome.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.MEASURE_OUT_DIR ?? "tmp-mobile-shell-chrome-measure";
const routes = [
  { id: "app", path: "/preview/mobile-shell-chrome", surface: "app" },
  { id: "site-walk", path: "/preview/mobile-shell-chrome", surface: "site-walk" },
  { id: "digital-twin", path: "/preview/mobile-shell-chrome", surface: "digital-twin" },
];

async function measureChrome(page, route) {
  const url = `${baseUrl}${route.path}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (!response?.ok()) {
    throw new Error(`Failed to load ${url} (${response?.status()})`);
  }

  await page.waitForSelector(`[data-measure-surface="${route.surface}"] [data-mobile-shell-chrome="header"]`, {
    timeout: 60_000,
  });
  await page.waitForSelector(`[data-measure-surface="${route.surface}"] [data-mobile-shell-chrome="bottom-nav"]`, {
    timeout: 60_000,
  });
  await page.locator(`[data-measure-surface="${route.surface}"]`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const chrome = await page.evaluate((surface) => {
    const root = document.querySelector(`[data-measure-surface="${surface}"]`);
    const header = root?.querySelector('[data-mobile-shell-chrome="header"]');
    const nav = root?.querySelector('[data-mobile-shell-chrome="bottom-nav"]');
    if (!header || !nav) return null;

    const headerRect = header.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const headerStyle = getComputedStyle(header);
    const navStyle = getComputedStyle(nav);

    const navLinks = [...nav.querySelectorAll("a")].map((link) => {
      const label = link.textContent?.trim() ?? "";
      const icon = link.querySelector("svg");
      const iconStyle = icon ? getComputedStyle(icon) : null;
      return {
        label,
        active: link.getAttribute("aria-current") === "page",
        iconColor: iconStyle?.color ?? null,
        labelColor: getComputedStyle(link.querySelector("span") ?? link).color,
      };
    });

    return {
      header: {
        top: Math.round(headerRect.top),
        height: Math.round(headerRect.height),
        left: Math.round(headerRect.left),
        width: Math.round(headerRect.width),
        bg: headerStyle.backgroundColor,
        borderBottom: headerStyle.borderBottomColor,
      },
      bottomNav: {
        top: Math.round(navRect.top),
        height: Math.round(navRect.height),
        left: Math.round(navRect.left),
        width: Math.round(navRect.width),
        bg: navStyle.backgroundColor,
        borderTop: navStyle.borderTopColor,
      },
      navLinks,
      headerActionCount: header.querySelectorAll('a[aria-label="Notifications and alerts"], a[aria-label="Account settings"]').length,
    };
  }, route.surface);

  const frame = page.locator(`[data-measure-surface="${route.surface}"] > div`);
  const screenshotPath = join(outDir, `${route.id}-390x844.png`);
  await frame.screenshot({ path: screenshotPath });

  return { route: route.id, path: route.path, url, chrome, screenshotPath };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });

    const results = [];
    for (const route of routes) {
      results.push(await measureChrome(page, route));
    }

    const report = {
      baseUrl,
      viewport: { width: 390, height: 844 },
      outDir,
      results,
    };

    const reportPath = join(outDir, "report.json");
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-mobile-shell-chrome] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

main();
