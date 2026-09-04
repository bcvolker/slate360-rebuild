// Screenshot gate for the AOB205 client experience (/preview/aob205/*), sprint V3.
// Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node scripts/ops/capture-aob205-client-ux.mjs
//   PROFILES=desktop,mobile,tablet   ONLY=04,05   (optional filters)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const ROOT = `${BASE}/preview/aob205`;
const OUT = process.env.OUT_DIR ?? "docs/ops/aob205-client-ux-v3";
const HIDE_DEV = "nextjs-portal, #__next-build-watcher, [data-nextjs-toast] { display: none !important; }";

const settle = (ms = 1200) => async (page) => { await page.waitForTimeout(ms); };
const sphere = async (page) => {
  const up = await page.waitForSelector(".psv-canvas", { timeout: 25_000 }).then(() => true).catch(() => false);
  if (!up) { await page.reload({ waitUntil: "load" }); await page.waitForSelector(".psv-canvas", { timeout: 60_000 }); }
  await page.waitForTimeout(2200);
};
const twin = async (page) => { await page.waitForFunction(() => !/Loading 3D twin/.test(document.body.innerText), null, { timeout: 150_000 }).catch(() => undefined); await page.waitForTimeout(2500); };
const then = (...steps) => async (page) => { for (const s of steps) await s(page); };
const click = (sel) => async (page) => { await page.locator(sel).first().click({ timeout: 8000 }); await page.waitForTimeout(500); };
const tab = (label) => async (page) => { await page.locator("[role=tab]", { hasText: label }).first().click({ timeout: 8000 }); await page.waitForTimeout(500); };
const tools = async (page) => { const open = await page.locator("[role=tab]").first().isVisible().catch(() => false); if (!open) { await page.getByRole("button", { name: "Tools" }).first().click(); await page.waitForTimeout(400); } };
const hover = (x, y) => async (page) => { await page.mouse.move(x, y); await page.waitForTimeout(300); };

const SHOTS = {
  desktop: [
    ["01-overview-rich", `${ROOT}`, settle(), { fullPage: true }],
    ["02-overview-walk-only", `${ROOT}?state=A`, settle(), { fullPage: true }],
    ["03-overview-360-only", `${ROOT}?state=B`, settle(), { fullPage: true }],
    ["04-walk-explore-path-off", `${ROOT}/walk?t=26&path=off`, then(sphere, hover(720, 640))],
    ["05-walk-explore-path-on", `${ROOT}/walk?t=26&path=on`, sphere],
    ["06-walk-play", `${ROOT}/walk?t=8&mode=play`, then(sphere, settle(2500))],
    ["07-walk-plan", `${ROOT}/walk?t=26&panel=plan`, sphere],
    ["08-walk-references", `${ROOT}/walk?t=26&panel=items`, sphere],
    ["09-walk-ask", `${ROOT}/walk?t=26&ask=1`, sphere],
    ["10-walk-highres-360", `${ROOT}/walk?t=33&path=off`, sphere],
    ["11-360-documentation", `${ROOT}/stations?s=s03`, sphere],
    ["12-360-stations-panel", `${ROOT}/stations?s=s03&panel=stations`, sphere],
    ["13-plan", `${ROOT}/plan`, settle(1800)],
    ["14-item-panel", `${ROOT}/walk?t=32&yaw=-55&pitch=-8&item=i-101`, sphere],
    ["15-item-page", `${ROOT}/items/i-101`, settle(), { fullPage: true }],
    ["16-twin-simulated", `${ROOT}/twin?state=D`, twin],
    ["17-brand-client", `${ROOT}/walk?t=26&brand=whitelabel`, sphere],
    ["18-brand-slate360", `${ROOT}?brand=slate`, settle(), { fullPage: true }],
  ],
  mobile: [
    ["01-overview-rich", `${ROOT}`, settle(), { fullPage: true }],
    ["02-overview-walk-only", `${ROOT}?state=A`, settle(), { fullPage: true }],
    ["03-explore", `${ROOT}/walk?t=26`, sphere],
    ["04-explore-path-on", `${ROOT}/walk?t=26&path=on`, sphere],
    ["05-tools-path", `${ROOT}/walk?t=26`, then(sphere, tools, tab("More"))],
    ["06-play", `${ROOT}/walk?t=8&mode=play`, then(sphere, settle(2500))],
    ["07-ask", `${ROOT}/walk?t=26`, then(sphere, tools, tab("Items"), click("[data-testid=ce-ask-open]"))],
    ["08-references", `${ROOT}/walk?t=26`, then(sphere, tools, tab("Items"))],
    ["09-walk-plan", `${ROOT}/walk?t=26`, then(sphere, tools, tab("Plan"))],
    ["10-360-documentation", `${ROOT}/stations?s=s03`, sphere],
    ["11-station-browser", `${ROOT}/stations?s=s03`, then(sphere, tools, tab("Stations"))],
    ["12-item", `${ROOT}/stations?s=s07`, then(sphere, tools, tab("Items"), click("text=Credenza clearance"))],
    ["13-twin-simulated", `${ROOT}/twin?state=D`, then(twin, tools)],
    ["14-brand-client", `${ROOT}?brand=whitelabel`, settle()],
    ["15-brand-slate360", `${ROOT}?brand=slate`, settle()],
  ],
  tablet: [
    ["01-overview-1024", `${ROOT}`, settle()],
    ["02-walk-1024", `${ROOT}/walk?t=26&panel=plan`, sphere],
    ["03-overview-768", `${ROOT}`, settle(), {}, { width: 768, height: 1024 }],
    ["04-walk-768", `${ROOT}/walk?t=26`, sphere, {}, { width: 768, height: 1024 }],
  ],
};

const CONTEXTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
};

async function warmUp(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const urls = [...new Set(Object.values(SHOTS).flat().map(([, u]) => u.split("?")[0]))];
  for (const u of urls) { await page.goto(u, { waitUntil: "load" }).catch(() => undefined); await page.waitForTimeout(300); }
  await ctx.close();
}

const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist", "--window-position=0,0"] });
await warmUp(browser);
const only = process.env.PROFILES?.split(",").filter(Boolean);
const onlyShots = process.env.ONLY?.split(",").filter(Boolean);
for (const [profile, shots] of Object.entries(SHOTS)) {
  if (only && !only.includes(profile)) continue;
  const ctx = await browser.newContext(CONTEXTS[profile]);
  let page = await ctx.newPage();
  mkdirSync(`${OUT}/${profile}`, { recursive: true });
  await page.goto(`${ROOT}/walk`, { waitUntil: "load" }).catch(() => undefined);
  await page.waitForSelector(".psv-canvas", { timeout: 120_000 }).catch(() => undefined);
  for (const [name, url, ready, opts = {}, viewport] of shots) {
    if (onlyShots && !onlyShots.some((p) => name.startsWith(p))) continue;
    await page.close().catch(() => undefined);
    page = await ctx.newPage();
    if (viewport) await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: "load" }).catch(() => page.goto(url));
    await page.addStyleTag({ content: HIDE_DEV });
    await ready(page).catch((e) => console.log("WARN", profile, name, String(e).slice(0, 140)));
    const path = `${OUT}/${profile}/${name}.png`;
    await page.screenshot({ path, ...opts });
    console.log("captured", path);
  }
  await ctx.close();
}
await browser.close();
