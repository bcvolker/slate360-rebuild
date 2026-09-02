import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://slate360-rebuild-git-feature-monday-spatial-release-v1-slate360.vercel.app";
const WALK = `${BASE}/w/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269`;
const TWIN = `${BASE}/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`;
const PORTAL = `${BASE}/preview/monday-portal`;
const OUT = "docs/ops/monday-release";

mkdirSync(`${OUT}/walkthrough`, { recursive: true });
mkdirSync(`${OUT}/twin`, { recursive: true });
mkdirSync(`${OUT}/portal`, { recursive: true });
mkdirSync(`${OUT}/videos`, { recursive: true });

async function shot(page, path) {
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", path);
}

const browser = await chromium.launch({
  headless: process.env.HEADED === "1" ? false : true,
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } },
});
const page = await desktop.newPage();

await page.goto(WALK, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForSelector("[data-testid='sw-poster-gate'] img, [data-testid='sw-pano']", { timeout: 30_000 });
await shot(page, `${OUT}/walkthrough/01-poster.png`);

const play = page.getByRole("button", { name: /play|enter/i }).first();
if (await play.count()) {
  await play.click({ force: true });
} else {
  await page.mouse.click(720, 520);
}
await page.waitForTimeout(3500);
await shot(page, `${OUT}/walkthrough/02-playing.png`);

await page.mouse.move(720, 420);
await page.mouse.down();
await page.mouse.move(420, 420, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(600);
await shot(page, `${OUT}/walkthrough/03-look-90.png`);

const scrub = page.locator("[data-testid='sw-timeline-scrub']");
if (await scrub.count()) {
  await scrub.evaluate((el) => {
    const input = el;
    input.value = "28";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
await page.waitForTimeout(800);
await shot(page, `${OUT}/walkthrough/04-scrubbed.png`);

const pathBtn = page.locator("[data-testid='sw-path-toggle']");
if (await pathBtn.count()) await pathBtn.click().catch(() => undefined);
await page.waitForTimeout(400);
await shot(page, `${OUT}/walkthrough/05-path-hud.png`);

const pin = page.locator(".sw-mark--document, .sw-mark--issue, button:has-text('Kitchen spec')").first();
if (await pin.count()) await pin.click({ timeout: 4_000 }).catch(() => undefined);
await page.waitForTimeout(800);
await shot(page, `${OUT}/walkthrough/06-pin-open.png`);

await page.mouse.move(720, 700);
await page.mouse.down();
await page.mouse.move(720, 200, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
await shot(page, `${OUT}/walkthrough/07-operator-standing.png`);

if (await scrub.count()) {
  await scrub.evaluate((el) => {
    el.value = "22";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
await page.waitForTimeout(800);
await shot(page, `${OUT}/walkthrough/08-operator-doorway.png`);

const walkVideo = page.video();
await page.close();
if (walkVideo) {
  const v = await walkVideo.path();
  console.log("walk video", v);
}

const tpage = await desktop.newPage();
await tpage.goto(TWIN, { waitUntil: "domcontentloaded", timeout: 90_000 });
await tpage.waitForSelector("[data-testid='kitchen-poster'], [data-testid='kitchen-layer-reality']", { timeout: 20_000 });
await shot(tpage, `${OUT}/twin/01-hero.png`);
await tpage.waitForTimeout(10_000);
await shot(tpage, `${OUT}/twin/02-reality.png`);
await tpage.locator("[data-testid='kitchen-layer-geometry']").click({ timeout: 8_000 }).catch(() => undefined);
await tpage.waitForTimeout(1200);
await shot(tpage, `${OUT}/twin/03-geometry.png`);
await tpage.locator("[data-testid='kitchen-layer-reality']").click({ timeout: 5_000 }).catch(() => undefined);
await tpage.waitForTimeout(1500);
await shot(tpage, `${OUT}/twin/04-transition.png`);
await tpage.locator("[data-testid='kitchen-station'], .kv-station").first().click({ timeout: 5_000 }).catch(() => undefined);
await tpage.waitForTimeout(800);
await shot(tpage, `${OUT}/twin/05-station.png`);
await tpage.locator("[data-testid='kitchen-measure'], [data-testid='kitchen-tools']").first().click({ timeout: 5_000 }).catch(() => undefined);
await tpage.waitForTimeout(600);
await shot(tpage, `${OUT}/twin/06-measure.png`);
const timings = await tpage.evaluate(() => {
  const api = window.__kitchenProof;
  return api ? { fps: api.fps(), timings: api.timings(), layer: api.layer(), splat: api.splatStats() } : null;
});
console.log("twin api", JSON.stringify(timings));
const twinVideo = tpage.video();
await tpage.close();
if (twinVideo) console.log("twin video", await twinVideo.path());

const ppage = await desktop.newPage();
await ppage.goto(PORTAL, { waitUntil: "domcontentloaded", timeout: 60_000 });
await ppage.waitForSelector("[data-testid='aec-portal']", { timeout: 20_000 });
await shot(ppage, `${OUT}/portal/01-desktop-landing.png`);
await ppage.locator("[data-testid='portal-history']").scrollIntoViewIfNeeded().catch(() => undefined);
await shot(ppage, `${OUT}/portal/02-history-rail.png`);
await ppage.locator("[data-testid='portal-attention']").scrollIntoViewIfNeeded().catch(() => undefined);
await shot(ppage, `${OUT}/portal/03-issues-docs.png`);
await ppage.goto(`${PORTAL}?theme=client`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await ppage.waitForSelector("[data-testid='aec-portal']", { timeout: 15_000 });
await shot(ppage, `${OUT}/portal/04-white-label.png`);
const portalVideo = ppage.video();
await ppage.close();
if (portalVideo) console.log("portal video", await portalVideo.path());

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m1 = await mobile.newPage();
await m1.goto(WALK, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m1.waitForTimeout(2500);
await shot(m1, `${OUT}/walkthrough/09-mobile-portrait.png`);
await m1.close();
const land = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const mland = await land.newPage();
await mland.goto(WALK, { waitUntil: "domcontentloaded", timeout: 60_000 });
await mland.waitForTimeout(2000);
await shot(mland, `${OUT}/walkthrough/10-mobile-landscape.png`);
await mland.close();
await land.close();

const m2 = await mobile.newPage();
await m2.goto(TWIN, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m2.waitForTimeout(4000);
await shot(m2, `${OUT}/twin/07-mobile.png`);
await m2.goto(PORTAL, { waitUntil: "domcontentloaded", timeout: 60_000 });
await m2.waitForTimeout(2000);
await shot(m2, `${OUT}/portal/05-mobile-landing.png`);
await m2.locator("[data-testid='portal-projects']").scrollIntoViewIfNeeded().catch(() => undefined);
await shot(m2, `${OUT}/portal/06-project-switcher.png`);
await m2.close();
await mobile.close();
await desktop.close();
await browser.close();
