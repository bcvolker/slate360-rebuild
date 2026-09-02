import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://slate360-rebuild-git-feature-monday-spatial-release-v1-slate360.vercel.app";
const WALK = `${BASE}/w/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269`;
const TWIN = `${BASE}/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`;
const OUT = "docs/ops/monday-release";

mkdirSync(`${OUT}/walkthrough`, { recursive: true });
mkdirSync(`${OUT}/twin`, { recursive: true });

async function shot(page, path) {
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", path);
}

const browser = await chromium.launch({
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } },
});
const dpage = await desktop.newPage();
const t0 = Date.now();
await dpage.goto(WALK, { waitUntil: "domcontentloaded", timeout: 60_000 });
await dpage.waitForTimeout(2500);
console.log("walk firstUsefulMs", Date.now() - t0);
await shot(dpage, `${OUT}/walkthrough/01-hero-first-load.png`);
const play = dpage.getByRole("button", { name: /play|enter|start/i }).first();
if (await play.count()) await play.click({ timeout: 5_000 }).catch(() => undefined);
else await dpage.mouse.click(720, 450);
await dpage.waitForTimeout(2000);
await shot(dpage, `${OUT}/walkthrough/02-active-playback.png`);
await shot(dpage, `${OUT}/walkthrough/03-chapters-stations.png`);
const pin = dpage.locator(".sw-marker, [data-kind='pin'], button:has-text('Kitchen spec')").first();
if (await pin.count()) await pin.click({ timeout: 4_000 }).catch(() => undefined);
await dpage.waitForTimeout(800);
await shot(dpage, `${OUT}/walkthrough/04-pin-document-drawer.png`);
await shot(dpage, `${OUT}/walkthrough/05-branded-client-view.png`);
const walkVideo = dpage.video();
await dpage.close();
if (walkVideo) {
  const v = await walkVideo.path();
  console.log("walk video", v);
}

const tpage = await desktop.newPage();
const t1 = Date.now();
await tpage.goto(TWIN, { waitUntil: "domcontentloaded", timeout: 60_000 });
await tpage.waitForSelector("[data-testid='kitchen-poster'], [data-testid='kitchen-layer-reality']", { timeout: 15_000 });
console.log("twin firstUsefulMs", Date.now() - t1);
await shot(tpage, `${OUT}/twin/01-hero-fallback-initial.png`);
await tpage.waitForTimeout(8000);
await shot(tpage, `${OUT}/twin/02-reality.png`);
await tpage.locator("[data-testid='kitchen-layer-geometry']").click({ timeout: 8_000 }).catch(() => undefined);
await tpage.waitForTimeout(1000);
await shot(tpage, `${OUT}/twin/03-geometry-same-pose.png`);
await tpage.locator("[data-testid='kitchen-tools']").click({ timeout: 5_000 }).catch(() => undefined);
await tpage.waitForTimeout(800);
await shot(tpage, `${OUT}/twin/04-measure.png`);
await shot(tpage, `${OUT}/twin/05-station-selection.png`);
await tpage.locator("[data-testid='kitchen-view']").click({ timeout: 5_000 }).catch(() => undefined);
await tpage.waitForTimeout(600);
await shot(tpage, `${OUT}/twin/06-dollhouse-or-plan.png`);
const timings = await tpage.evaluate(() => {
  const api = window.__kitchenProof;
  return api ? { fps: api.fps(), timings: api.timings(), layer: api.layer(), splat: api.splatStats() } : null;
});
console.log("twin api", JSON.stringify(timings));
const twinVideo = tpage.video();
await tpage.close();
if (twinVideo) console.log("twin video", await twinVideo.path());

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m1 = await mobile.newPage();
await m1.goto(WALK, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m1.waitForTimeout(2000);
await shot(m1, `${OUT}/walkthrough/06-mobile.png`);
await m1.close();
const m2 = await mobile.newPage();
await m2.goto(TWIN, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m2.waitForTimeout(2500);
await shot(m2, `${OUT}/twin/07-mobile.png`);
await m2.goto(`${TWIN}&fail=spz`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m2.waitForTimeout(2000);
await shot(m2, `${OUT}/twin/08-slow-load-fallback.png`);
await m2.close();
await mobile.close();
await desktop.close();
await browser.close();
