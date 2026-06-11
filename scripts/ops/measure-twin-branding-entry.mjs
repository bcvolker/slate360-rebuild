#!/usr/bin/env node
/**
 * Twin 360 branding + capture entry verification at 390×844.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-twin-branding-entry.mjs
 *
 * Optional:
 *   MEASURE_BASE_URL=https://www.slate360.ai node scripts/ops/measure-twin-branding-entry.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = path.resolve("tmp-twin-branding-measure");
const VIEWPORT = { width: 390, height: 844 };
const FAKE_MEDIA_ARGS = [
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];

/** @typedef {{ label: string; path: string; waitSelector?: string; entryNote?: string }} RouteSpec */

/** @type {RouteSpec[]} */
const ROUTE_SPECS = [
  {
    label: "home",
    path: "/digital-twin",
    waitSelector: '[aria-label="Start a quick scan"]',
    entryNote: "MobilePlatformShell → DigitalTwinHomeClient",
  },
  {
    label: "capture-quick-boot",
    path: "/digital-twin/capture?mode=quick",
    waitSelector: '[data-twin-capture-boot="loading"], [data-twin-capture-screen], [data-twin-capture-picker]',
    entryNote:
      "StudioAppShell fullBleed → DigitalTwinShell passthrough → TwinCaptureFlow (quick boot → TwinCaptureScreen)",
  },
  {
    label: "capture-picker",
    path: "/digital-twin/capture",
    waitSelector: "[data-twin-capture-picker]",
    entryNote: "StudioAppShell fullBleed → DigitalTwinShell passthrough → TwinCaptureFlow → TwinCapturePicker",
  },
  {
    label: "twins-list",
    path: "/digital-twin/twins",
    waitSelector: "main, [data-mobile-shell-version]",
    entryNote: "StudioAppShell fullBleed → DigitalTwinShell chrome → twins page",
  },
  {
    label: "twins-list-processing",
    path: "/digital-twin/twins?status=processing",
    waitSelector: "main, [data-mobile-shell-version]",
    entryNote: "My Twins filtered by ?status=processing",
  },
  {
    label: "review-post-submit",
    path: "/dev/screens?screen=twin-review&device=mobile&submitted=1",
    waitSelector: '[data-twin-review="post-submit"]',
    entryNote: "DevTwinReviewSandbox → TwinCaptureReviewScreen post-submit CTA",
  },
  {
    label: "capture-dev-sandbox",
    path: "/dev/screens?screen=twin-capture&device=mobile&clips=0&mode=video",
    waitSelector: '[data-twin-chrome="shutter"]',
    entryNote: "DevTwinCaptureSandbox → TwinCaptureScreen (unauthenticated dev route)",
  },
];

async function measureRoute(page, spec) {
  const url = `${baseUrl}${spec.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });

  if (spec.waitSelector) {
    try {
      await page.waitForSelector(spec.waitSelector, { timeout: 45_000 });
    } catch {
      // auth redirect or empty hub — still capture accent + screenshot
    }
  }

  await page.waitForTimeout(500);

  const sample = await page.evaluate(({ label, path: routePath, entryNote }) => {
    const shell =
      document.querySelector('[data-mobile-shell-version="unified-v2"]') ??
      document.querySelector('[data-mobile-route="digital-twin"]');
    const nav = document.querySelector('nav[aria-label="Platform"]');
    const loginRedirect = window.location.pathname.startsWith("/login");

    const readAccent = (el) => {
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        mobileShellAccent: style.getPropertyValue("--mobile-shell-accent").trim(),
        navFgActive: style.getPropertyValue("--mobile-bottom-nav-fg-active").trim(),
        fieldPrimaryBg: style.getPropertyValue("--mobile-field-primary-bg").trim(),
      };
    };

    const visibleMarkers = {
      picker: Boolean(document.querySelector("[data-twin-capture-picker]")),
      captureScreen: Boolean(document.querySelector("[data-twin-capture-screen]")),
      quickBoot: Boolean(document.querySelector('[data-twin-capture-boot="loading"]')),
      devShutter: Boolean(document.querySelector('[data-twin-chrome="shutter"]')),
      quickScanCard: Boolean(document.querySelector('[aria-label="Start a quick scan"]')),
      postSubmitCta: Boolean(document.querySelector('[data-twin-review="post-submit"]')),
    };

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height) };
    };

    const startScanCard = document.querySelector('[aria-label="Start a quick scan"]');
    const quickActionCard = document.querySelector('[data-testid="mobile-quick-action-grid"] button, [data-testid="mobile-quick-action-grid"] a');
    const dockFrame = document.querySelector('[data-testid="mobile-expandable-panel-frame"]');

    const hubDimensions = {
      startScanCardPx: box(startScanCard),
      quickActionCardPx: box(quickActionCard),
      dockCollapsedPx: dockFrame?.getAttribute("data-collapsed-height") ?? null,
      dockFrameHeightPx: box(dockFrame)?.height ?? null,
    };

    return {
      label,
      path: routePath,
      entryNote,
      loginRedirect,
      pathname: window.location.pathname,
      search: window.location.search,
      shellRouteAttr: shell?.getAttribute("data-mobile-route") ?? null,
      accentOnShell: readAccent(shell),
      accentOnNav: readAccent(nav),
      accentOnDocument: readAccent(document.documentElement),
      visibleMarkers,
      hubDimensions,
      bodySnippet: document.body.innerText.slice(0, 240).replace(/\s+/g, " ").trim(),
    };
  }, spec);

  const shotPath = path.join(outDir, `${spec.label}-390x844.png`);
  await page.screenshot({ path: shotPath, fullPage: false });

  return { ...sample, screenshot: shotPath };
}

async function measureCaptureEntryPath(page) {
  const url = `${baseUrl}/dev/screens?screen=twin-capture&device=mobile&clips=0&mode=video`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-twin-chrome="shutter"]', { timeout: 90_000 });
  await page.waitForTimeout(400);

  const shotPath = path.join(outDir, "entry-quick-scan-dev-390x844.png");
  await page.screenshot({ path: shotPath, fullPage: false });

  return {
    route: "/digital-twin/capture?mode=quick (production equivalent)",
    steps: [
      "DigitalTwinHomeClient handleQuickScan → buildTwinCaptureLaunchUrl({ mode: 'quick' })",
      "GET /digital-twin/capture?mode=quick",
      "app/digital-twin/(shell)/capture/page.tsx → TwinCaptureFlow(quickMode=true)",
      "TwinCaptureFlow skipPicker → quickBoot loading → POST /api/digital-twin/spaces",
      "TwinCaptureFlow step=capture → TwinCaptureScreen (full-bleed passthrough shell)",
    ],
    devSandboxUrl: url,
    screenshot: shotPath,
  };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: FAKE_MEDIA_ARGS });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      permissions: ["camera", "microphone"],
    });
    const page = await context.newPage();

    const routeResults = [];
    for (const spec of ROUTE_SPECS) {
      routeResults.push(await measureRoute(page, spec));
    }

    const entryPath = await measureCaptureEntryPath(page);

    const report = {
      baseUrl,
      viewport: VIEWPORT,
      expectedAccent: "var(--twin360-blue) or rgb(61, 142, 255)",
      expectedHubDimensions: {
        startScanCardHeightPx: 96,
        quickActionCardHeightPx: 52,
        dockCollapsedHeightPx: 40,
      },
      routeResults,
      quickScanEntryPath: entryPath,
      generatedAt: new Date().toISOString(),
    };

    const reportPath = path.join(outDir, "report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-twin-branding-entry] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

void main();
