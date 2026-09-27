#!/usr/bin/env node
/**
 * Room 213 posters from the ACTUAL corrected viewer (poster mode: no UI, verified render profile, final crop,
 * per-aspect hero camera). One render per aspect → loading posters + the Open Graph card (branding composited
 * outside the 3D render). Needs a GPU browser: run on a machine with a GPU, against a running server.
 *
 * Usage: node scripts/ops/room213-posters.mjs [baseUrl=http://127.0.0.1:3215]
 * Writes: public/preview/room213/poster-landscape.jpg (1600×1000), poster-portrait.jpg (1080×2160),
 *         app/preview/room213/opengraph-image.jpg + twitter-image.jpg (1200×630), and their .alt.txt files.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3215";
const browser = await chromium.launch({ headless: true, args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] });

async function render({ width, height, dpr }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.goto(`${base}/preview/room213?poster=1&probe=1`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => window.__r213?.phase === "ready", undefined, { timeout: 600_000 });
  await page.waitForTimeout(4000); // let the sort settle after the first frame
  const check = await page.evaluate(() => window.__r213.check);
  if (!check?.ok) throw new Error(`render profile not verified: ${JSON.stringify(check?.mismatches)}`);
  const cdp = await ctx.newCDPSession(page);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await ctx.close();
  return Buffer.from(shot.data, "base64");
}

async function compose(pngs, { width, height, html, out, quality }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(html(`data:image/png;base64,${pngs.toString("base64")}`), { waitUntil: "load" });
  await page.screenshot({ path: out, type: "jpeg", quality });
  await ctx.close();
}

const plain = (src) => `<html><body style="margin:0;background:black"><img src="${src}" style="width:100vw;height:100vh;object-fit:cover;display:block"></body></html>`;
const logo = `data:image/svg+xml;base64,${readFileSync("public/uploads/SLATE 360-Color Reversed Lockup.svg").toString("base64")}`;
const og = (src) => `<html><body style="margin:0;position:relative;width:1200px;height:630px;overflow:hidden;background:black">
  <img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(to top,rgba(0,0,0,.55),rgba(0,0,0,0))"></div>
  <img src="${logo}" style="position:absolute;left:40px;bottom:34px;height:40px">
</body></html>`;

const land = await render({ width: 1600, height: 1000, dpr: 1 });
await compose(land, { width: 1600, height: 1000, html: plain, out: "public/preview/room213/poster-landscape.jpg", quality: 84 });
const port = await render({ width: 540, height: 1080, dpr: 2 });
await compose(port, { width: 1080, height: 2160, html: plain, out: "public/preview/room213/poster-portrait.jpg", quality: 82 });
const card = await render({ width: 1200, height: 630, dpr: 1 });
await compose(card, { width: 1200, height: 630, html: og, out: "app/preview/room213/opengraph-image.jpg", quality: 86 });
writeFileSync("app/preview/room213/twitter-image.jpg", readFileSync("app/preview/room213/opengraph-image.jpg"));
const alt = "Payne Hall Room 213 — Slate360 interactive spatial capture, dollhouse view";
writeFileSync("app/preview/room213/opengraph-image.alt.txt", alt);
writeFileSync("app/preview/room213/twitter-image.alt.txt", alt);
await browser.close();
console.log("posters written");
