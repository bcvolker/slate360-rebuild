#!/usr/bin/env node
/**
 * Measure with-plans capture slice 2: chrome, pin placement, rapid-drop guard.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/measure-plan-capture.mjs
 */

import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function waitForPlanChrome(page) {
  await page.waitForSelector('[data-capture-chrome="plan-top-bar"]', { state: "attached", timeout: 90_000 });
  await page.waitForSelector('[data-capture-canvas="with-plans"]', { state: "attached", timeout: 90_000 });
  await page.waitForSelector(".leaflet-container", { state: "attached", timeout: 90_000 });
  await page.waitForTimeout(1200);
}

async function measureChrome(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-dev-device="mobile"]');
    const topBar = document.querySelector('[data-capture-chrome="plan-top-bar"]');
    const sheetPill = document.querySelector('[data-capture-chrome="plan-sheet-pill"]');
    const filmstrip = document.querySelector('[data-capture-chrome="filmstrip"]');
    const rail = document.querySelector('[data-capture-chrome="plan-bottom-rail"]');
    if (!frame || !topBar || !sheetPill || !filmstrip || !rail) return null;
    const cx = (rect) => rect.left + rect.width / 2;
    const topBarRect = topBar.getBoundingClientRect();
    const sheetPillRect = sheetPill.getBoundingClientRect();
    const filmstripRect = filmstrip.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    return {
      viewportWidth: frame.getBoundingClientRect().width,
      viewportHeight: frame.getBoundingClientRect().height,
      topBarBottomY: Math.round(topBarRect.bottom),
      sheetPillCenterX: Math.round(cx(sheetPillRect)),
      filmstripBottomY: Math.round(filmstripRect.bottom),
      planRailBottomY: Math.round(railRect.bottom),
    };
  });
}

async function dropPinAndMeasurePlacement(page, xRatio, yRatio) {
  return page.evaluate(
    async ({ xRatio: xr, yRatio: yr }) => {
      const container = document.querySelector(".leaflet-container");
      const map = window.__devPlanLeafletMap;
      const imageSize = window.__devPlanImageSize;
      if (!container || !map || !imageSize || !window.L) return null;
      const rect = container.getBoundingClientRect();
      const clientX = rect.left + rect.width * xr;
      const clientY = rect.top + rect.height * yr;
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX,
          clientY,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 580));
      container.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          clientX,
          clientY,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      const markers = Array.from(
        document.querySelectorAll('[data-plan-pin-marker="session"]'),
      );
      const marker = markers[markers.length - 1];
      if (!marker) return null;
      const xPct = Number.parseFloat(marker.getAttribute("data-plan-pin-x-pct") ?? "");
      const yPct = Number.parseFloat(marker.getAttribute("data-plan-pin-y-pct") ?? "");
      const pressLatLng = map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
      const xFromPress = (pressLatLng.lng / imageSize.width) * 100;
      const yFromPress = (pressLatLng.lat / imageSize.height) * 100;
      const deltaPct = Math.max(Math.abs(xPct - xFromPress), Math.abs(yPct - yFromPress));
      const deltaPx = (deltaPct / 100) * Math.max(map.getSize().x, map.getSize().y);
      return {
        markerCount: markers.length,
        deltaPx: Math.round(deltaPx * 10) / 10,
        tolerancePx: 4,
        pass: deltaPx <= 4,
      };
    },
    { xRatio, yRatio },
  );
}

async function setMapZoom(page, zoomLabel) {
  await page.evaluate((label) => {
    const map = window.__devPlanLeafletMap;
    if (!map) return;
    if (label === "min") map.setZoom(-2);
    else if (label === "2x") map.setZoom(1);
    else map.setZoom(0);
    map.invalidateSize();
  }, zoomLabel);
  await page.waitForTimeout(500);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `${baseUrl}/dev/screens?screen=capture-plans&device=mobile&frameW=390&frameH=844&resetPins=1`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
    await waitForPlanChrome(page);

    const chromeBaseline = await measureChrome(page);
    if (!chromeBaseline) throw new Error("Missing plan chrome nodes");

    const placementResults = [];
    for (const zoom of ["min", "1x", "2x"]) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
      await waitForPlanChrome(page);
      if (zoom === "min") await setMapZoom(page, "min");
      else if (zoom === "2x") await setMapZoom(page, "2x");

      const sample = await dropPinAndMeasurePlacement(page, 0.42, 0.38);
      const tolerancePx = zoom === "min" ? 18 : 4;
      if (!sample || sample.deltaPx > tolerancePx) {
        throw new Error(`Placement failed at zoom=${zoom} delta=${sample?.deltaPx}px`);
      }
      placementResults.push({ zoom, ...sample, tolerancePx, pass: true });
      await page.keyboard.press("Escape");
    }

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
    await waitForPlanChrome(page);

    const rapidPresses = [];
    await page.waitForFunction(() => typeof window.__devPlanPinCount === "function");
    await page.waitForTimeout(800);

    for (let i = 0; i < 5; i += 1) {
      await dropPinAndMeasurePlacement(page, 0.25 + i * 0.1, 0.3 + i * 0.05);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        (expected) =>
          typeof window.__devPlanPinCount === "function" && window.__devPlanPinCount() >= expected,
        i + 1,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(120);
    }

    const rapidDrop = await page.evaluate(() => {
      const markers = document.querySelectorAll('[data-plan-pin-marker="session"]');
      const apiPinCount =
        typeof window.__devPlanPinCount === "function" ? window.__devPlanPinCount() : markers.length;
      return {
        apiPinCount,
        markerCount: markers.length,
        pass: apiPinCount === 5 && markers.length === 5,
      };
    });

    if (!rapidDrop.pass) {
      throw new Error(
        `Rapid-drop guard failed api=${rapidDrop.apiPinCount} markers=${rapidDrop.markerCount}`,
      );
    }

    const remountUrl = `${baseUrl}/dev/screens?screen=capture-plans&device=mobile&frameW=390&frameH=844`;
    await page.goto(remountUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
    await waitForPlanChrome(page);
    const markerCountAfterRemount = await page.locator('[data-plan-pin-marker="session"]').count();
    if (markerCountAfterRemount !== 5) {
      throw new Error(`Remount pin loss: expected 5 markers, got ${markerCountAfterRemount}`);
    }

    const chromeAfter = await measureChrome(page);
    if (!chromeAfter) throw new Error("Missing plan chrome after remount");

    console.log(
      JSON.stringify(
        {
          baseUrl,
          viewport: { width: 390, height: 844 },
          chromeBaseline,
          chromeAfter,
          chromeUnchanged:
            chromeBaseline.topBarBottomY === chromeAfter.topBarBottomY &&
            chromeBaseline.planRailBottomY === chromeAfter.planRailBottomY,
          placementResults,
          rapidDrop,
          markerCountAfterRemount,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[measure-plan-capture] ${message}`);
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

void main();
