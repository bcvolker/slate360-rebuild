#!/usr/bin/env node
/** Screenshots of the marketing homepage: scrolls through first so in-view animations settle. */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
mkdirSync("tmp-marketing", { recursive: true });

const browser = await chromium.launch({ headless: true });
for (const [name, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(1500);
  // Scroll through the page so whileInView animations fire everywhere.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `tmp-marketing/home-${name}-hero.png` });
  await page.evaluate(() => document.querySelector("#apps")?.scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `tmp-marketing/home-${name}-apps.png` });
  await page.evaluate(() => document.querySelector("#pricing")?.scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `tmp-marketing/home-${name}-pricing.png` });
  console.log(`${name}: hero/apps/pricing captured`);
  await page.close();
}
await browser.close();
