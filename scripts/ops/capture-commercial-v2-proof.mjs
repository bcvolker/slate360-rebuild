import { mkdirSync, writeFileSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL;
if (!BASE) throw new Error("PLAYWRIGHT_BASE_URL required");
const TOKEN = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const WALK = `${BASE}/w/${TOKEN}?v=commercial-v2`;
const PORTAL = `${BASE}/portal/${TOKEN}`;
const DASH = `${BASE}/dashboard`;
const OUT = "docs/ops/commercial-walkthrough-v2";
mkdirSync(`${OUT}/walkthrough`, { recursive: true });
mkdirSync(`${OUT}/videos`, { recursive: true });
const log = [];
const note = (msg) => {
  console.log(msg);
  log.push(msg);
};

async function darkRatio(buf, { x = 80, y = 70, w, h } = {}) {
  const img = await loadImage(buf);
  const width = w ?? img.width - 160;
  const height = h ?? img.height - 220;
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(x, y, Math.max(8, width), Math.max(8, height)).data;
  let dark = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 18 && data[i + 1] < 18 && data[i + 2] < 18) dark += 1;
  }
  return Math.round((dark / n) * 1000) / 1000;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } },
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("slate360_cookie_consent", "accepted");
    localStorage.setItem("sw-look-hint-v1", "1");
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
await page.goto(WALK, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForSelector("[data-testid='sw-pano'] canvas, canvas", { timeout: 90_000 });
await page.waitForTimeout(5000);

const floatingAsk = await page.locator("text=Ask about this").count();
const floatingMine = await page.locator("text=My questions").count();
const spacesChip = await page.locator("text=Spaces · Entire Walk").count();
const editor = await page.locator("text=Start space here").count();
note(`floating_ask=${floatingAsk} floating_mine=${floatingMine} spaces_chip=${spacesChip} editor=${editor}`);

const rest = await page.screenshot({ path: `${OUT}/walkthrough/01-client-view.png`, timeout: 0 });
const restDark = await darkRatio(rest);
note(`rest_dark_ratio=${restDark}`);

await page.mouse.move(720, 360);
await page.mouse.down();
await page.mouse.move(180, 620, { steps: 36 });
await page.mouse.up();
await page.waitForTimeout(500);
const dragged = await page.screenshot({ path: `${OUT}/walkthrough/02-rotate-toward-operator.png`, timeout: 0 });
const dragDark = await darkRatio(dragged);
note(`drag_dark_ratio=${dragDark}`);

await page.screenshot({ path: `${OUT}/walkthrough/03-path-off.png`, timeout: 0 });
const stationsOff = await page.locator(".sw-path-station").count();
note(`path_off_stations=${stationsOff}`);
const pathBtn = page.locator("[data-testid='sw-path-toggle']");
if (await pathBtn.count()) await pathBtn.click();
await page.waitForTimeout(900);
const stationsOn = await page.locator(".sw-path-station").count();
note(`path_on_stations=${stationsOn}`);
await page.screenshot({ path: `${OUT}/walkthrough/04-path-on.png`, timeout: 0 });

const before = await page.locator("[data-testid='sw-timeline-time']").textContent();
const clicked = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll(".sw-path-station")];
  const kitchen = buttons.find((el) => (el.getAttribute("aria-label") || "").includes("Kitchen"));
  const btn = kitchen || buttons[buttons.length - 1];
  if (btn instanceof HTMLElement) {
    btn.click();
    return btn.getAttribute("aria-label");
  }
  return null;
});
if (!clicked) {
  await page.locator("[data-testid='sw-public-toolbar'] button[aria-label='Next']").click().catch(() => undefined);
}
await page.waitForTimeout(1600);
const after = await page.locator("[data-testid='sw-timeline-time']").textContent();
note(`click_to_move ${before} -> ${after} station=${clicked}`);
await page.screenshot({ path: `${OUT}/walkthrough/05-after-station.png`, timeout: 0 });

await page.locator("[data-testid='sw-spaces']").click().catch(() => undefined);
await page.waitForTimeout(400);
const spaceMenu = await page.locator("[data-testid='sw-space-menu']").count();
note(`spaces_menu=${spaceMenu}`);
await page.screenshot({ path: `${OUT}/walkthrough/06-spaces-menu.png`, timeout: 0 });
await page.screenshot({ path: `${OUT}/walkthrough/07-toolbar.png`, timeout: 0 });

await page.goto(PORTAL, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/walkthrough/08-portal.png`, timeout: 0 });

await page.goto(DASH, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/walkthrough/09-dashboard.png`, timeout: 0 });
const heroImgs = await page.locator("a[href^='/projects/'] img").count();
note(`dashboard_hero_imgs=${heroImgs}`);

writeFileSync(`${OUT}/CAPTURE_LOG.txt`, `${log.join("\n")}\n`);
await ctx.close();
await browser.close();
note("done");
