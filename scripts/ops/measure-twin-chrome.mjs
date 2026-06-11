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

/** @typedef {{ label: string; clips: number; mode: "video" | "photos"; recording?: boolean; coverage?: number; roll?: number; motion?: string; ghost?: boolean }} Scenario */

/** @type {Scenario[]} */
const SCENARIOS = [
  ...CLIP_COUNTS.flatMap((clips) => [
    { label: "idle-video", clips, mode: "video" },
    { label: "recording-video", clips, mode: "video", recording: true },
    { label: "photos-idle", clips, mode: "photos" },
  ]),
  ...[0, 50, 100].map((coverage) => ({
    label: `coverage-${coverage}`,
    clips: 0,
    mode: "video",
    coverage,
  })),
  ...[0, 5, 12].map((roll) => ({
    label: `roll-${roll}`,
    clips: 0,
    mode: "video",
    roll,
  })),
  {
    label: "ghost-clip2-recording",
    clips: 1,
    mode: "video",
    recording: true,
    ghost: true,
  },
  ...["good", "slow", "shake"].map((motion) => ({
    label: `guide-${motion}-recording`,
    clips: 0,
    mode: "video",
    recording: true,
    motion,
  })),
];

function centerX(rect) {
  return rect.left + rect.width / 2;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function waitForStreaming(page) {
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => {
      const shutter = document.querySelector('[data-dev-device="mobile"] [data-twin-chrome="shutter"]');
      return shutter instanceof HTMLButtonElement && !shutter.disabled;
    },
    undefined,
    { timeout: 45_000 },
  );
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.round((base64.length * 3) / 4);
}

async function clickShutter(page) {
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => {
      const shutter = document.querySelector('[data-dev-device="mobile"] [data-twin-chrome="shutter"]');
      return shutter instanceof HTMLButtonElement && !shutter.disabled;
    },
    undefined,
    { timeout: 15_000 },
  );
  await page.evaluate(() => {
    const shutter = document.querySelector('[data-dev-device="mobile"] [data-twin-chrome="shutter"]');
    if (!(shutter instanceof HTMLButtonElement) || shutter.disabled) {
      throw new Error("shutter not ready");
    }
    shutter.click();
  });
}

async function assertGhostOnClip2Recording(page) {
  const url = `${baseUrl}/dev/screens?screen=twin-capture&device=mobile&clips=0&mode=video`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-twin-chrome="shutter"]', { timeout: 90_000 });
  await waitForStreaming(page);

  await clickShutter(page);
  await page.waitForSelector('[data-twin-chrome="rec-timer-chip"]', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await clickShutter(page);
  await page.waitForSelector('[data-twin-chrome="rec-timer-chip"]', { state: "hidden", timeout: 10_000 });
  await page.waitForTimeout(600);

  await clickShutter(page);
  await page.waitForSelector('[data-twin-chrome="rec-timer-chip"]', { timeout: 10_000 });
  await page.waitForTimeout(500);

  const ghostAssert = await page.evaluate(() => {
    const ghost = document.querySelector('[data-twin-chrome="clip-ghost"]');
    const img = document.querySelector('[data-twin-chrome="clip-ghost-frame"]');
    if (!ghost || !(img instanceof HTMLImageElement)) {
      return { ok: false, reason: "ghost overlay or frame image missing" };
    }
    const rect = ghost.getBoundingClientRect();
    const opacity = Number.parseFloat(getComputedStyle(ghost).opacity || "0");
    const src = img.currentSrc || img.src || "";
    const byteSize =
      src.startsWith("data:") && src.includes(",")
        ? Math.round(((src.split(",")[1] ?? "").length * 3) / 4)
        : 0;
    return {
      ok: opacity > 0 && rect.width > 0 && rect.height > 0 && byteSize > 0,
      opacity,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      byteSize,
      hasSrc: src.length > 0,
    };
  });

  if (!ghostAssert.ok) {
    throw new Error(
      `[measure-twin-chrome] ghost clip-2 assertion failed: ${JSON.stringify(ghostAssert)}`,
    );
  }

  return ghostAssert;
}

async function measureScenario(page, scenario) {
  const stateQuery = scenario.recording ? "&state=recording" : "";
  const coverageQuery = scenario.coverage !== undefined ? `&coverage=${scenario.coverage}` : "";
  const rollQuery = scenario.roll !== undefined ? `&roll=${scenario.roll}` : "";
  const motionQuery = scenario.motion ? `&motion=${scenario.motion}` : "";
  const ghostQuery = scenario.ghost ? "&ghost=1" : "";
  const url = `${baseUrl}/dev/screens?screen=twin-capture&device=mobile&clips=${scenario.clips}&mode=${scenario.mode}${stateQuery}${coverageQuery}${rollQuery}${motionQuery}${ghostQuery}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
  await page.locator('[data-dev-device="mobile"]').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-twin-chrome="shutter"]', { timeout: 90_000 });
  await page.waitForTimeout(600);

  const sample = await page.evaluate(({ label, clips, mode, recording, coverage, roll, motion, ghost }) => {
    const frame = document.querySelector('[data-dev-device="mobile"]');
    const shutter = document.querySelector('[data-twin-chrome="shutter"]');
    const modeSelector = document.querySelector('[data-twin-chrome="mode-selector"]');
    const recChip = document.querySelector('[data-twin-chrome="rec-timer-chip"]');
    const topBar = document.querySelector('[data-twin-capture-screen] header');
    const clipChips = document.querySelector('[data-twin-chrome="clip-chips"]');
    const light = document.querySelector('[data-twin-chrome="light-button"]');
    const done = document.querySelector('[data-twin-chrome="done-button"]');
    const captureGuide = document.querySelector('[data-twin-chrome="capture-guide"]');
    const guideLabels = document.querySelectorAll('[data-twin-guide-label]');
    const levelLine = document.querySelector('[data-twin-chrome="level-line"]');
    const coverageRing = document.querySelector('[data-twin-chrome="coverage-ring"]');
    const clipGhost = document.querySelector('[data-twin-chrome="clip-ghost-caption"]');
    if (!frame || !shutter || !modeSelector) return null;
    if (recording && !recChip) return null;
    if (!recording && !modeSelector.querySelector("button")) return null;

    const frameRect = frame.getBoundingClientRect();
    const viewportCenterX = frameRect.left + frameRect.width / 2;
    const shutterRect = shutter.getBoundingClientRect();
    const modeRect = modeSelector.getBoundingClientRect();
    const topBarRect = topBar?.getBoundingClientRect() ?? null;
    const clipRect = clipChips?.getBoundingClientRect() ?? null;
    const lightRect = light?.getBoundingClientRect() ?? null;
    const doneRect = done?.getBoundingClientRect() ?? null;
    const guideRect = captureGuide?.getBoundingClientRect() ?? null;
    const guideState = captureGuide?.getAttribute("data-twin-guide-state") ?? null;

    const cx = (rect) => rect.left + rect.width / 2;
    const gap = (above, below) => Math.round(below.top - above.bottom);
    const hits = (a, b) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    const nodes = [
      guideRect && { id: "capture-guide", rect: guideRect },
      levelLine && { id: "level-line", rect: levelLine.getBoundingClientRect() },
      clipGhost && { id: "clip-ghost", rect: clipGhost.getBoundingClientRect() },
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

    const topBarOverlap =
      topBarRect && guideRect ? hits(topBarRect, guideRect) : false;
    const recChipOverlap =
      recChip && guideRect ? hits(recChip.getBoundingClientRect(), guideRect) : false;

    return {
      label,
      clips,
      mode,
      recording: Boolean(recording),
      coverage: coverage ?? null,
      roll: roll ?? null,
      motion: motion ?? null,
      ghost: Boolean(ghost),
      coverageRingVisible: Boolean(coverageRing),
      levelLineVisible: Boolean(levelLine),
      ghostVisible: Boolean(document.querySelector('[data-twin-chrome="clip-ghost"]')),
      recChipVisible: Boolean(recChip),
      modePillVisible: Boolean(!recording && modeSelector.querySelector("button")),
      captureGuideVisible: Boolean(captureGuide),
      guideState,
      guideLabelCount: guideLabels.length,
      guideBelowTopBarPx:
        topBarRect && guideRect ? Math.round(guideRect.top - topBarRect.bottom) : null,
      topBarOverlap,
      recChipOverlap,
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

    let ghostClip2 = { skipped: true, reason: "MEASURE_SKIP_GHOST=1" };
    if (process.env.MEASURE_SKIP_GHOST !== "1") {
      try {
        ghostClip2 = await assertGhostOnClip2Recording(page);
        console.error(`[measure-twin-chrome] ghost clip-2 assertion PASS: ${JSON.stringify(ghostClip2)}`);
      } catch (ghostError) {
        const message = ghostError instanceof Error ? ghostError.message : String(ghostError);
        if (process.env.MEASURE_REQUIRE_GHOST === "1") throw ghostError;
        ghostClip2 = { skipped: true, reason: message };
        console.error(`[measure-twin-chrome] ghost clip-2 assertion SKIPPED: ${message}`);
      }
    }

    const results = [];
    for (const scenario of SCENARIOS) {
      results.push(await measureScenario(page, scenario));
    }

    const overlapFailures = results.filter((sample) => sample.overlapPairs.length > 0);
    if (overlapFailures.length > 0) {
      console.error(
        `[measure-twin-chrome] overlap failures: ${overlapFailures
          .map((sample) => `${sample.label} (${sample.overlapPairs.join(", ")})`)
          .join("; ")}`,
      );
      process.exit(1);
    }

    const guideFailures = results.filter((sample) => {
      if (sample.recording) {
        const layoutFail =
          !sample.captureGuideVisible ||
          sample.topBarOverlap ||
          sample.recChipOverlap ||
          (sample.guideBelowTopBarPx !== null && sample.guideBelowTopBarPx < 0);
        const labelFail = sample.motion
          ? sample.guideLabelCount !== 1
          : sample.guideLabelCount > 1;
        return layoutFail || labelFail;
      }
      return sample.captureGuideVisible;
    });
    if (guideFailures.length > 0) {
      console.error(
        `[measure-twin-chrome] capture-guide failures: ${guideFailures
          .map(
            (sample) =>
              `${sample.label} visible=${sample.captureGuideVisible} labels=${sample.guideLabelCount} topOverlap=${sample.topBarOverlap} recOverlap=${sample.recChipOverlap}`,
          )
          .join("; ")}`,
      );
      process.exit(1);
    }

    console.log(
      JSON.stringify(
        {
          baseUrl,
          viewport: { width: 390, height: 844 },
          fakeMedia: true,
          ghostClip2Assertion: ghostClip2,
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
