#!/usr/bin/env node
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = path.resolve("tmp-capture-start-choice");
const outFile = path.join(outDir, "start-choice-390x844.png");

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(
  `${baseUrl}/dev/screens?screen=capture-start-choice&device=mobile&frameW=390&frameH=844`,
  { waitUntil: "networkidle", timeout: 120_000 },
);
await page.waitForSelector('[data-capture-chrome="start-choice-sheet"]', { timeout: 60_000 });
await page.screenshot({ path: outFile, fullPage: true });

const plan = await page.locator('[data-capture-chrome="start-choice-plan"]').isVisible();
const camera = await page.locator('[data-capture-chrome="start-choice-camera"]').isVisible();
console.log(JSON.stringify({ plan, camera, ok: plan && camera, outFile }));
await browser.close();
