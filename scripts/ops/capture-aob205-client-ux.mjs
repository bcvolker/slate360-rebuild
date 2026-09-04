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
  await page.waitForSelector(".psv-canvas", { timeout: 60_000 });
  await page.waitForTimeout(800);
  const play = page.getByRole("button", { name: "Play", exact: true });
  if (await play.count()) await play.first().click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
};
const station = async (page) => { await page.waitForSelector(".psv-canvas", { state: "attached", timeout: 60_000 }); await page.waitForTimeout(2500); };
const settle = async (page) => { await page.waitForTimeout(1200); };

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
    ["03-tools-sheet", `${ROOT}/walk?t=26&yaw=0&panel=items`, playWalk],
    ["04-plan", `${ROOT}/walk?t=26&yaw=0&panel=plan`, playWalk],
    ["05-360-documentation", `${ROOT}/stations?s=s03`, station],
    ["06-twin", `${ROOT}/twin`, waitTwin],
    ["07-item", `${ROOT}/stations?s=s07&item=i-101`, station],
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
for (const [profile, shots] of Object.entries(SHOTS)) {
  const ctx = await browser.newContext(
    profile === "mobile"
      ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  const page = await ctx.newPage();
  mkdirSync(`${OUT}/${profile}`, { recursive: true });
  // Prime this context's cache with the walkthrough proxy so the first walk shot is not racing a cold video fetch.
  await page.goto(`${ROOT}/walk`, { waitUntil: "load" }).catch(() => undefined);
  await page.waitForSelector(".psv-canvas", { timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  for (const [name, url, ready, opts = {}] of shots) {
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
