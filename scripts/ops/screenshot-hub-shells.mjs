#!/usr/bin/env node
/**
 * Screenshot the three mobile home hub shells in the dev sandbox.
 *
 * Usage:
 *   npx next dev --hostname 127.0.0.1 --port 3000
 *   node scripts/ops/screenshot-hub-shells.mjs
 */

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = "tmp-hub-redesign";
const SCREENS = [
  { id: "hub-app", file: "hub-app.png" },
  { id: "hub-site-walk", file: "hub-site-walk.png" },
  { id: "hub-twin", file: "hub-twin.png" },
];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let failed = false;
for (const { id, file } of SCREENS) {
  const url = `${baseUrl}/dev/screens?screen=${id}&device=mobile`;
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  const status = response?.status() ?? 0;
  await page.waitForSelector('[data-dev-device="mobile"]', { state: "attached", timeout: 90_000 });
  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasError = /Application error|Unhandled Runtime|Internal Server Error/i.test(bodyText);
  await page.screenshot({ path: `${OUT_DIR}/${file}`, fullPage: true });
  console.log(`${id}: status=${status} error=${hasError} -> ${OUT_DIR}/${file}`);
  if (status !== 200 || hasError) failed = true;
}

await browser.close();
process.exit(failed ? 1 : 0);
