import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://slate360-rebuild-65s5jd9bw-slate360.vercel.app";
const TOKEN = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const PORTAL = `${BASE}/portal/${TOKEN}`;
const WALK = `${BASE}/w/${TOKEN}`;
const DOCS = `${BASE}/portal/${TOKEN}/documents`;
const OUT = "docs/ops/spatial-experience-v2";
const log = [];

mkdirSync(`${OUT}/portal`, { recursive: true });
mkdirSync(`${OUT}/walkthrough`, { recursive: true });
mkdirSync(`${OUT}/documents`, { recursive: true });
mkdirSync(`${OUT}/mobile`, { recursive: true });
mkdirSync(`${OUT}/videos`, { recursive: true });

function note(msg) {
  console.log(msg);
  log.push(msg);
}

async function shot(page, path) {
  await page.screenshot({ path, fullPage: false, timeout: 20_000 });
  note(`wrote ${path}`);
}

async function acceptCookies(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("slate360_cookie_consent", "accepted");
      localStorage.removeItem("sw-look-hint-v1");
    } catch {
      /* ignore */
    }
  });
}

async function readView(page) {
  return page.evaluate(() => {
    const pano = document.querySelector("[data-testid='sw-pano'], .psv-container");
    const hint = document.querySelector("[data-testid='sw-look-hint']");
    const gate = document.querySelector("[data-testid='sw-poster-gate']");
    const crumbs = document.querySelectorAll(".sw-path-crumb, .sw-mark--waypoint");
    const pins = document.querySelectorAll(".sw-mark--document, .sw-mark--issue, .sw-pin");
    const time = document.querySelector("[data-testid='sw-timeline-time']")?.textContent ?? "";
    const spaces = document.querySelector("[data-testid='sw-spaces']");
    return {
      href: location.href,
      hasPano: Boolean(pano),
      gate: Boolean(gate),
      hint: hint?.textContent ?? null,
      crumbs: crumbs.length,
      pins: pins.length,
      time,
      spaces: spaces?.textContent ?? null,
      canvas: Boolean(document.querySelector("canvas")),
    };
  });
}

const browser = await chromium.launch({
  headless: process.env.HEADED === "1" ? false : true,
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } },
});
await acceptCookies(desktop);
const page = await desktop.newPage();

await page.goto(PORTAL, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForSelector("[data-testid='portal-hero']", { timeout: 30_000 });
await page.waitForFunction(() => {
  const img = document.querySelector("[data-testid='portal-hero'] img");
  return img instanceof HTMLImageElement && img.naturalWidth > 16;
}, { timeout: 45_000 }).catch(() => note("hero image did not load in time"));
await shot(page, `${OUT}/portal/01-landing.png`);
note(`portal hero surface=${await page.getAttribute("[data-testid='portal-hero']", "data-surface")}`);

const openWalk = page.getByTestId("open-walkthrough");
const href = await openWalk.getAttribute("href");
note(`open walkthrough href=${href}`);
await Promise.all([
  page.waitForURL(/\/w\//, { timeout: 20_000, waitUntil: "domcontentloaded" }).catch(() => null),
  openWalk.click({ timeout: 8_000 }),
]);
if (!page.url().includes("/w/")) {
  note("click did not leave portal; going to walk URL directly");
  await page.goto(WALK, { waitUntil: "domcontentloaded", timeout: 90_000 });
}
await page.waitForSelector("[data-testid='sw-poster-gate'], [data-testid='sw-pano']", { timeout: 30_000 });
await shot(page, `${OUT}/walkthrough/01-gate.png`);
note(`after open walk ${JSON.stringify(await readView(page))}`);

const enter = page.locator("[data-testid='sw-enter']");
if (await enter.count()) {
  await enter.click({ force: true });
  await page.waitForSelector("[data-testid='sw-poster-gate']", { state: "detached", timeout: 15_000 }).catch(() => note("gate stayed after Play"));
} else {
  note("no sw-enter button");
  await page.mouse.click(720, 520);
}
await page.waitForTimeout(3500);
await shot(page, `${OUT}/walkthrough/02-playing.png`);
note(`after play ${JSON.stringify(await readView(page))}`);

await page.mouse.move(720, 380);
await page.mouse.down();
await page.mouse.move(360, 380, { steps: 18 });
await page.mouse.up();
await page.waitForTimeout(500);
await shot(page, `${OUT}/walkthrough/03-look-90.png`);
note(`after look ${JSON.stringify(await readView(page))}`);

await page.mouse.move(720, 400);
await page.mouse.wheel(0, -480);
await page.waitForTimeout(400);
await shot(page, `${OUT}/walkthrough/04-zoom.png`);
note(`after zoom ${JSON.stringify(await readView(page))}`);

const scrub = page.locator("[data-testid='sw-timeline-scrub']");
if (await scrub.count()) {
  const box = await scrub.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height / 2, { steps: 16 });
    await page.mouse.up();
  }
}
await page.waitForTimeout(800);
await shot(page, `${OUT}/walkthrough/05-scrubbed.png`);
note(`after scrub ${JSON.stringify(await readView(page))}`);

const pathBtn = page.locator("[data-testid='sw-path-toggle']");
if (await pathBtn.count()) {
  const pressed = await pathBtn.getAttribute("aria-pressed");
  if (pressed === "false") await pathBtn.click().catch(() => undefined);
}
await page.waitForTimeout(400);
await shot(page, `${OUT}/walkthrough/06-path-hud.png`);
note(`after path ${JSON.stringify(await readView(page))}`);

const nextStation = page.getByLabel("Next station");
if (await nextStation.count()) await nextStation.click().catch(() => undefined);
await page.waitForTimeout(700);
await shot(page, `${OUT}/walkthrough/07-station.png`);

const pin = page.locator(".sw-mark--document, .sw-mark--issue, button:has-text('Kitchen spec')").first();
if (await pin.count()) await pin.click({ timeout: 4000 }).catch(() => undefined);
await page.waitForTimeout(900);
await shot(page, `${OUT}/walkthrough/08-pin.png`);
note(`after pin ${JSON.stringify(await readView(page))}`);

const openAtt = page.locator(".sw-drawer a:has-text('Open')").first();
if (await openAtt.count()) {
  note("pin drawer has Open attachment");
}
const closeDrawer = page.locator(".sw-drawer [aria-label='Close']");
if (await closeDrawer.count()) await closeDrawer.click().catch(() => undefined);
await page.waitForTimeout(400);
await shot(page, `${OUT}/walkthrough/09-closed.png`);

const spaces = page.locator("[data-testid='sw-spaces'] summary");
if (await spaces.count()) {
  await spaces.click().catch(() => undefined);
  await page.waitForTimeout(400);
}
await shot(page, `${OUT}/walkthrough/10-spaces.png`);
note(`spaces ${JSON.stringify(await readView(page))}`);

await page.goto(DOCS, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForSelector("[data-testid='portal-documents-page']", { timeout: 20_000 });
await shot(page, `${OUT}/documents/01-list.png`);

const viewLoc = page.getByText("View locations").first();
if (await viewLoc.count()) {
  await viewLoc.click();
  await page.waitForTimeout(2500);
  await shot(page, `${OUT}/documents/02-spatial-ref.png`);
  note(`spatial ref ${JSON.stringify(await readView(page))}`);
} else {
  note("NO View locations link on documents page");
}

const video = page.video();
await desktop.close();
if (video) {
  const vpath = await video.path();
  note(`video ${vpath}`);
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await acceptCookies(mobile);
const m = await mobile.newPage();
await m.goto(PORTAL, { waitUntil: "domcontentloaded", timeout: 90_000 });
await m.waitForSelector("[data-testid='portal-hero']", { timeout: 30_000 });
await shot(m, `${OUT}/mobile/01-portal.png`);
const mOpen = m.getByTestId("open-walkthrough");
await Promise.all([
  m.waitForURL(/\/w\//, { timeout: 15_000, waitUntil: "domcontentloaded" }).catch(() => null),
  mOpen.click({ timeout: 8_000 }).catch(() => null),
]);
if (!m.url().includes("/w/")) await m.goto(WALK, { waitUntil: "domcontentloaded", timeout: 90_000 });
await m.waitForTimeout(1200);
await shot(m, `${OUT}/mobile/02-gate.png`);
const mPlay = m.locator("[data-testid='sw-enter']");
if (await mPlay.count()) {
  await mPlay.click({ force: true });
  await m.waitForSelector("[data-testid='sw-poster-gate']", { state: "detached", timeout: 12_000 }).catch(() => note("mobile gate stayed"));
}
await m.waitForTimeout(3500);
await shot(m, `${OUT}/mobile/03-playing.png`);
note(`mobile after play ${JSON.stringify(await readView(m))}`);
await m.touchscreen.tap(195, 360);
await m.waitForTimeout(200);
await m.mouse.move(195, 360);
await m.mouse.down();
await m.mouse.move(60, 360, { steps: 12 });
await m.mouse.up();
await m.waitForTimeout(400);
await shot(m, `${OUT}/mobile/04-look.png`);
await m.goto(DOCS, { waitUntil: "domcontentloaded", timeout: 60_000 });
await shot(m, `${OUT}/mobile/05-documents.png`);
await mobile.close();
await browser.close();

writeFileSync(`${OUT}/CAPTURE_LOG.txt`, `${log.join("\n")}\n`);
note("done");
