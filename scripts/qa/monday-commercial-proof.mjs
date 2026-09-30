import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.MONDAY_PROOF_BASE ??
  "https://slate360-rebuild-git-feature-monday-commercial-proof-v1-slate360.vercel.app";
const TOKEN = process.env.MONDAY_WALK_TOKEN || "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const ITEM = "520c6060-0a60-4b91-9cc1-033784baa77f";
const OUT = path.resolve("docs/ops/monday-release/portal");

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("shot", file);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await desktop.goto(`${BASE}/portal/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await desktop.waitForTimeout(2500);
  await shot(desktop, "01-desktop-landing");
  await desktop.locator("[data-testid=portal-history]").scrollIntoViewIfNeeded().catch(() => undefined);
  await shot(desktop, "02-project-history");
  await desktop.locator("[data-testid=portal-documents]").scrollIntoViewIfNeeded().catch(() => undefined);
  await shot(desktop, "03-documents");
  await desktop.locator("[data-testid=portal-activity]").scrollIntoViewIfNeeded().catch(() => undefined);
  await shot(desktop, "04-activity");

  await desktop.goto(`${BASE}/portal/${TOKEN}/documents`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await desktop.waitForTimeout(1500);
  await shot(desktop, "05-documents-page");

  await desktop.goto(`${BASE}/portal/${TOKEN}/item/${ITEM}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await desktop.waitForTimeout(1500);
  await shot(desktop, "06-issue-discussion");

  await desktop.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await desktop.waitForTimeout(3000);
  await shot(desktop, "07-walk-poster");

  const play = desktop.locator("button, [data-testid=sw-enter], .sw-poster-gate button").filter({ hasText: /play|enter/i }).first();
  if (await play.count()) {
    await play.click({ force: true }).catch(() => undefined);
    await desktop.waitForTimeout(2500);
  }
  await shot(desktop, "08-walk-playing");

  const pano = desktop.locator("[data-testid=sw-pano], canvas, .psv-container").first();
  if (await pano.count()) {
    const box = await pano.boundingBox();
    if (box) {
      await desktop.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await desktop.mouse.down();
      await desktop.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2, { steps: 12 });
      await desktop.mouse.up();
    }
  }
  await shot(desktop, "09-walk-90deg");

  const scrub = desktop.locator("[data-testid=sw-timeline-scrub]");
  if (await scrub.count()) {
    const box = await scrub.boundingBox();
    if (box) {
      await desktop.mouse.move(box.x + 8, box.y + box.height / 2);
      await desktop.mouse.down();
      await desktop.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 16 });
      await desktop.mouse.up();
    }
  }
  await shot(desktop, "10-timeline-halfway");

  const pathToggle = desktop.locator("[data-testid=sw-path-toggle]");
  if (await pathToggle.count()) await pathToggle.click().catch(() => undefined);
  await desktop.waitForTimeout(800);
  await shot(desktop, "11-path-hud");

  const pin = desktop.locator(".sw-pin, [data-pin], button").filter({ hasText: /spec|rfi|kitchen/i }).first();
  if (await pin.count()) await pin.click({ force: true }).catch(() => undefined);
  await desktop.waitForTimeout(800);
  await shot(desktop, "12-pin-drawer");
  await shot(desktop, "13-operator-masked");

  await desktop.video?.path?.();
  const rec = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  await rec.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await rec.waitForTimeout(2000);
  const recPlay = rec.locator("button, [data-testid=sw-enter], .sw-poster-gate button").filter({ hasText: /play|enter/i }).first();
  if (await recPlay.count()) await recPlay.click({ force: true }).catch(() => undefined);
  await rec.waitForTimeout(3000);
  const recPano = rec.locator("[data-testid=sw-pano], canvas, .psv-container").first();
  if (await recPano.count()) {
    const box = await recPano.boundingBox();
    if (box) {
      await rec.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await rec.mouse.down();
      await rec.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 10 });
      await rec.mouse.up();
    }
  }
  const recScrub = rec.locator("[data-testid=sw-timeline-scrub]");
  if (await recScrub.count()) {
    const box = await recScrub.boundingBox();
    if (box) {
      await rec.mouse.move(box.x + 10, box.y + box.height / 2);
      await rec.mouse.down();
      await rec.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 12 });
      await rec.mouse.up();
    }
  }
  const recPath = rec.locator("[data-testid=sw-path-toggle]");
  if (await recPath.count()) await recPath.click().catch(() => undefined);
  await rec.waitForTimeout(2000);
  await rec.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${BASE}/portal/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await mobile.waitForTimeout(2000);
  await shot(mobile, "14-mobile-portal");
  await mobile.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await mobile.waitForTimeout(2000);
  await shot(mobile, "15-mobile-walk");
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(800);
  await shot(mobile, "16-mobile-walk-landscape");

  await browser.close();
  console.log("BASE", BASE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
