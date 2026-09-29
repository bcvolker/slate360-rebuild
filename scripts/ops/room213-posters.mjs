#!/usr/bin/env node
/**
 * Room 213 posters from the ACTUAL corrected viewer (poster mode: no UI, verified render profile, final crop,
 * per-aspect hero camera). One render per aspect → loading posters + the Open Graph card (branding composited
 * outside the 3D render). Needs a GPU browser: run on a machine with a GPU, against a running server.
 *
 * Usage: node scripts/ops/room213-posters.mjs [baseUrl=http://127.0.0.1:3215]
 * Writes: public/preview/room213/poster-landscape.jpg (1600×1000), poster-portrait.jpg (1080×2160),
 *         public/preview/room213/share-dollhouse-v2.jpg (1200×630 link preview, referenced from page.tsx metadata;
 *         the shipped file also carries a brand panel composited afterwards).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3215";
// A/B page support: [route=/preview/room213] [prefix=""] -> <prefix>poster-*.jpg and <prefix>share.jpg (golden defaults unchanged).
const route = process.argv[3] ?? "/preview/room213";
const prefix = process.argv[4] ?? "";
const browser = await chromium.launch({ headless: true, args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] });

async function render({ width, height, dpr }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.goto(`${base}${route}?poster=1&probe=1`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => window.__r213?.phase === "ready", undefined, { timeout: 600_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // dev-server badge, never in a poster
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
// Homepage brand: the Slate360 icon mark + "SLATE" / green "360" wordmark (colours read from the design tokens).
const css = readFileSync("app/globals.css", "utf8");
const token = (name) => css.match(new RegExp(`${name}:\s*([^;]+);`))?.[1].trim();
const GREEN = token("--mkt-brand-green");
const SURFACE = token("--mkt-surface");
const icon = `data:image/svg+xml;base64,${readFileSync("assets/brand/slate360-icon.svg").toString("base64")}`;
const mark = `<div style="position:absolute;left:40px;bottom:34px;display:flex;align-items:center;gap:12px">
  <img src="${icon}" style="height:42px"><span style="font:600 25px/1 'Segoe UI',Inter,system-ui,sans-serif;letter-spacing:.13em;color:${SURFACE}">SLATE<span style="color:${GREEN}">360</span></span></div>`;
const og = (src) => `<html><body style="margin:0;position:relative;width:1200px;height:630px;overflow:hidden;background:black">
  <img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(to top,rgba(0,0,0,.55),rgba(0,0,0,0))"></div>
  ${mark}
</body></html>`;

const land = await render({ width: 1600, height: 1000, dpr: 1 });
await compose(land, { width: 1600, height: 1000, html: plain, out: `public/preview/room213/${prefix}poster-landscape.jpg`, quality: 84 });
const port = await render({ width: 540, height: 1080, dpr: 2 });
await compose(port, { width: 1080, height: 2160, html: plain, out: `public/preview/room213/${prefix}poster-portrait.jpg`, quality: 82 });
const card = await render({ width: 1200, height: 630, dpr: 1 });
await compose(card, { width: 1200, height: 630, html: og, out: prefix ? `public/preview/room213/${prefix}share.jpg` : "public/preview/room213/share-dollhouse-v2.jpg", quality: 86 });
await browser.close();
console.log("posters written");
