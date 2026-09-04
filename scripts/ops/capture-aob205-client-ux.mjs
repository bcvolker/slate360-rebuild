// Screenshot gate for the AOB205 client experience (/preview/aob205/*).
// Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 node scripts/ops/capture-aob205-client-ux.mjs
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const ROOT = `${BASE}/preview/aob205`;
const OUT = "docs/ops/aob205-client-ux";
const HIDE_DEV = "nextjs-portal, #__next-build-watcher, [data-nextjs-toast] { display: none !important; }";

const waitTwin = async (page) => {
  await page.waitForFunction(() => !/Loading 3D twin/.test(document.body.innerText), null, { timeout: 150_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
};
const playWalk = async (page) => {
  // Media decoders are released lazily; if the sphere is not up quickly, reload once.
  const up = await page.waitForSelector(".psv-canvas", { timeout: 25_000 }).then(() => true).catch(() => false);
  if (!up) { await page.reload({ waitUntil: "load" }); await page.waitForSelector(".psv-canvas", { timeout: 60_000 }); }
  await page.waitForTimeout(800);
  const play = page.getByRole("button", { name: "Play", exact: true });
  if (await play.count()) await play.first().click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
};
const station = async (page) => { await page.waitForSelector(".psv-canvas", { state: "attached", timeout: 60_000 }); await page.waitForTimeout(2500); };
const settle = async (page) => { await page.waitForTimeout(1200); };
// Mobile: open the sheet through the UI (Tools → tab) rather than a deep link, as a client would.
const openSheet = (tab, rowText) => async (page) => {
  const sheetOpen = await page.locator("[role=tab]").first().isVisible().catch(() => false);
  if (!sheetOpen) { await page.getByRole("button", { name: "Tools" }).first().click(); await page.waitForTimeout(400); }
  if (tab) await page.locator("[role=tab]", { hasText: tab }).first().click();
  await page.waitForTimeout(400);
  if (rowText) { await page.getByRole("button", { name: new RegExp(rowText) }).first().click(); await page.waitForTimeout(600); }
};
const playThen = (after) => async (page) => { await playWalk(page); await after(page); };
const stationThen = (after) => async (page) => { await station(page); await after(page); };

const SHOTS = {
  desktop: [
    ["01-overview", `${ROOT}`, settle, { fullPage: true }],
    ["02-walkthrough", `${ROOT}/walk?t=26&yaw=0`, playWalk],
    ["03-walkthrough-plan", `${ROOT}/walk?t=26&yaw=0&panel=plan`, playWalk],
    ["04-360-documentation", `${ROOT}/stations?s=s03&panel=stations`, station],
    ["05-reality-twin", `${ROOT}/twin`, waitTwin],
    ["06-project-item", `${ROOT}/walk?t=32&yaw=-55&pitch=-8&item=i-101`, playWalk],
    ["07-plan-mode", `${ROOT}/plan`, settle],
    ["08-item-page", `${ROOT}/items/i-101`, settle, { fullPage: true }],
  ],
  mobile: [
    ["01-overview", `${ROOT}`, settle, { fullPage: true }],
    ["02-walkthrough", `${ROOT}/walk?t=26&yaw=0`, playWalk],
    ["03-tools-sheet", `${ROOT}/walk?t=26&yaw=0`, playThen(openSheet("Items"))],
    ["04-plan", `${ROOT}/walk?t=26&yaw=0`, playThen(openSheet("Plan"))],
    ["05-360-documentation", `${ROOT}/stations?s=s03`, station],
    ["06-twin", `${ROOT}/twin`, waitTwin],
    ["07-item", `${ROOT}/stations?s=s07`, stationThen(openSheet("Items", "Credenza clearance"))],
  ],
};

// Headed so the desktop GPU renders the Gaussian twin (headless shell has no WebGL acceleration).
// Warm every route once so dev-server compilation never eats a capture wait.
async function warmUp(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const urls = [...new Set([...SHOTS.desktop, ...SHOTS.mobile].map(([, u]) => u.split("?")[0]))];
  for (const u of urls) { await page.goto(u, { waitUntil: "load" }).catch(() => undefined); await page.waitForTimeout(400); }
  await ctx.close();
}
const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--window-position=0,0"] });
await warmUp(browser);
const only = process.env.PROFILES?.split(",").filter(Boolean);
for (const [profile, shots] of Object.entries(SHOTS)) {
  if (only && !only.includes(profile)) continue;
  const ctx = await browser.newContext(
    profile === "mobile"
      ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  let page = await ctx.newPage();
  mkdirSync(`${OUT}/${profile}`, { recursive: true });
  // Prime this context's cache with the walkthrough proxy so the first walk shot is not racing a cold video fetch.
  await page.goto(`${ROOT}/walk`, { waitUntil: "load" }).catch(() => undefined);
  await page.waitForSelector(".psv-canvas", { timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  for (const [name, url, ready, opts = {}] of shots) {
    await page.close().catch(() => undefined);
    page = await ctx.newPage(); // fresh page per shot so previous media elements are released
    await page.goto(url, { waitUntil: "load" }).catch(() => page.goto(url));
    await page.addStyleTag({ content: HIDE_DEV });
    await ready(page).catch((e) => console.log("WARN", profile, name, String(e).slice(0, 120)));
    const path = `${OUT}/${profile}/${name}.png`;
    console.log("ready", profile, name);
    await page.screenshot({ path, ...opts });
    console.log("captured", path);
  }
  await ctx.close();
}
await browser.close();
