#!/usr/bin/env node
/**
 * Measure Twin 360 capture chrome in DevTwinCaptureSandbox via Playwright.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-twin-chrome.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const CLIP_COUNTS = [0, 1, 4];
const FAKE_MEDIA_ARGS = [
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];

/** @typedef {{ label: string; clips: number; mode: "video" | "photos"; recording?: boolean }} Scenario */

/** @type {Scenario[]} */
const SCENARIOS = [
  ...CLIP_COUNTS.flatMap((clips) => [
    { label: "idle-video", clips, mode: "video" },
    { label: "recording-video", clips, mode: "video", recording: true },
    { label: "photos-idle", clips, mode: "photos" },
  ]),
];

function centerX(rect) {
  return rect.left + rect.width / 2;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function waitForStreaming(page) {
  await page.waitForFunction(
    () => {
      const shutter = document.querySelector('[data-twin-chrome="shutter"]');
      return shutter instanceof HTMLButtonElement && !shutter.disabled;
    },
    undefined,
    { timeout: 45_000 },
  );
}

async function measureScenario(page, scenario) {
  const stateQuery = scenario.recording ? "&state=recording" : "";
  const url = `${baseUrl}/dev/screens?screen=twin-capture&device=mobile&clips=${scenario.clips}&mode=${scenario.mode}${stateQuery}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { timeout: 90_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-twin-chrome="shutter"]', { timeout: 90_000 });
  await waitForStreaming(page);
  await page.waitForTimeout(400);

  const sample = await page.evaluate(({ label, clips, mode, recording }) => {
    const frame = document.querySelector('[data-dev-device="mobile"]');
    const shutter = document.querySelector('[data-twin-chrome="shutter"]');
    const modeSelector = document.querySelector('[data-twin-chrome="mode-selector"]');
    const clipChips = document.querySelector('[data-twin-chrome="clip-chips"]');
    const light = document.querySelector('[data-twin-chrome="light-button"]');
    const done = document.querySelector('[data-twin-chrome="done-button"]');
    if (!frame || !shutter || !modeSelector) return null;

    const frameRect = frame.getBoundingClientRect();
    const viewportCenterX = frameRect.left + frameRect.width / 2;
    const shutterRect = shutter.getBoundingClientRect();
    const modeRect = modeSelector.getBoundingClientRect();
    const clipRect = clipChips?.getBoundingClientRect() ?? null;
    const lightRect = light?.getBoundingClientRect() ?? null;
    const doneRect = done?.getBoundingClientRect() ?? null;

    const cx = (rect) => rect.left + rect.width / 2;
    const gap = (above, below) => Math.round(below.top - above.bottom);

    const nodes = [
      clipRect && { id: "clip-chips", rect: clipRect },
      { id: "mode-selector", rect: modeRect },
      { id: "shutter", rect: shutterRect },
      lightRect && { id: "light", rect: lightRect },
      doneRect && { id: "done", rect: doneRect },
    ].filter(Boolean);

    const overlapPairs = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const hit =
          a.rect.left < b.rect.right &&
          a.rect.right > b.rect.left &&
          a.rect.top < b.rect.bottom &&
          a.rect.bottom > b.rect.top;
        if (hit) overlapPairs.push(`${a.id}×${b.id}`);
      }
    }

    return {
      label,
      clips,
      mode,
      recording: Boolean(recording),
      viewportWidth: Math.round(frameRect.width),
      viewportHeight: Math.round(frameRect.height),
      viewportCenterX: Math.round(viewportCenterX),
      shutterCenterX: Math.round(cx(shutterRect)),
      shutterCenterDeltaX: Math.round(cx(shutterRect) - viewportCenterX),
      clipToModeGapPx: clipRect ? gap(clipRect, modeRect) : null,
      modeToShutterGapPx: gap(modeRect, shutterRect),
      shutterToLightCenterDeltaY: lightRect
        ? Math.round(cx(lightRect) - cx(shutterRect))
        : null,
      lightToShutterCenterDeltaY: lightRect
        ? Math.round(lightRect.top + lightRect.height / 2 - (shutterRect.top + shutterRect.height / 2))
        : null,
      doneToShutterCenterDeltaY: doneRect
        ? Math.round(doneRect.top + doneRect.height / 2 - (shutterRect.top + shutterRect.height / 2))
        : null,
      overlapPairs,
    };
  }, scenario);

  if (!sample) throw new Error(`Missing chrome nodes for ${scenario.label} clips=${scenario.clips}`);
  return sample;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: FAKE_MEDIA_ARGS });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      permissions: ["camera", "microphone"],
    });
    const page = await context.newPage();

    const results = [];
    for (const scenario of SCENARIOS) {
      results.push(await measureScenario(page, scenario));
    }

    console.log(
      JSON.stringify(
        {
          baseUrl,
          viewport: { width: 390, height: 844 },
          fakeMedia: true,
          results,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-twin-chrome] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

void main();
