import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "";
const TOKEN = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const OUT = "docs/ops/ux-reset";
mkdirSync(`${OUT}/desktop`, { recursive: true });
mkdirSync(`${OUT}/mobile`, { recursive: true });
mkdirSync(`${OUT}/videos`, { recursive: true });
const log = [];
const note = (m) => { console.log(m); log.push(m); };
const shot = async (page, path) => {
  await page.screenshot({ path, timeout: 0, animations: "disabled" });
  note(`wrote ${path}`);
};

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } },
});
await ctx.addInitScript(() => {
  try { localStorage.setItem("slate360_cookie_consent", "accepted"); } catch { /* ignore */ }
});
const page = await ctx.newPage();

await page.goto(`${BASE}/preview/creator-home`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(1500);
await shot(page, `${OUT}/desktop/01-dashboard.png`);

await page.goto(`${BASE}/portal/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(2000);
await shot(page, `${OUT}/desktop/02-project.png`);

await page.goto(`${BASE}/preview/walkthrough-library`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(1200);
await shot(page, `${OUT}/desktop/03-library.png`);

await page.goto(`${BASE}/preview/studio-shell`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForSelector("[data-testid='studio-preview']", { timeout: 20_000 });
await page.waitForTimeout(1200);
await shot(page, `${OUT}/desktop/04-studio.png`);
await shot(page, `${OUT}/desktop/05-studio-privacy.png`);

await page.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForSelector("[data-testid='sw-pano']", { timeout: 45_000 });
await page.waitForTimeout(4000);
const gate = await page.locator("[data-testid='sw-poster-gate']").count();
note(`gate count=${gate}`);
await shot(page, `${OUT}/desktop/06-walk-before-play.png`);
await page.mouse.move(720, 380);
await page.mouse.down();
await page.mouse.move(320, 380, { steps: 18 });
await page.mouse.up();
await shot(page, `${OUT}/desktop/06b-look-before-play.png`);
const play = page.locator("[data-testid='sw-play-pause']");
if (await play.count()) await play.click({ force: true });
await page.waitForTimeout(2500);
await shot(page, `${OUT}/desktop/07-playing.png`);
const pathBtn = page.locator("[data-testid='sw-path-toggle']");
if (await pathBtn.count()) await pathBtn.click().catch(() => undefined);
await shot(page, `${OUT}/desktop/08-path.png`);

await page.goto(`${BASE}/portal/${TOKEN}/documents`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await shot(page, `${OUT}/desktop/09-documents.png`);

const video = page.video();
await ctx.close();
if (video) note(`video ${await video.path()}`);

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.addInitScript(() => {
  try { localStorage.setItem("slate360_cookie_consent", "accepted"); } catch { /* ignore */ }
});
const m = await mobile.newPage();
await m.goto(`${BASE}/preview/creator-home`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await shot(m, `${OUT}/mobile/11-dashboard.png`);
await m.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await m.waitForSelector("[data-testid='sw-pano']", { timeout: 45_000 }).catch(() => undefined);
await m.waitForTimeout(6000);
await shot(m, `${OUT}/mobile/10-walk.png`);
note(`install banner ${await m.locator("text=Install the Slate360 app").count()}`);
await mobile.close();
await browser.close();
writeFileSync(`${OUT}/CAPTURE_LOG.txt`, `${log.join("\n")}\n`);
note("done");
