import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.MONDAY_PROOF_BASE ??
  "https://slate360-rebuild-git-feature-monday-commercial-757527-slate360.vercel.app";
const TOKEN = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const OUT = path.resolve("docs/ops/monday-release/portal");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rec = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  await rec.addInitScript(() => localStorage.setItem("slate360_cookie_consent", "accepted"));
  await rec.goto(`${BASE}/w/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await rec.waitForTimeout(2500);
  await rec.screenshot({ path: path.join(OUT, "17-walk-poster-after-consent.png") });
  const enter = rec.locator(".sw-enter-btn, [data-testid=sw-enter]").first();
  await enter.click({ timeout: 15_000 });
  await rec.waitForTimeout(3500);
  await rec.screenshot({ path: path.join(OUT, "18-walk-after-play.png") });
  const pano = rec.locator("[data-testid=sw-pano], .psv-container, canvas").first();
  const box = await pano.boundingBox();
  if (box) {
    await rec.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await rec.mouse.down();
    await rec.mouse.move(box.x + 160, box.y + box.height / 2, { steps: 14 });
    await rec.mouse.up();
  }
  await rec.screenshot({ path: path.join(OUT, "19-walk-look.png") });
  const scrub = rec.locator("[data-testid=sw-timeline-scrub]");
  if (await scrub.count()) {
    const s = await scrub.boundingBox();
    if (s) {
      await rec.mouse.move(s.x + 12, s.y + s.height / 2);
      await rec.mouse.down();
      await rec.mouse.move(s.x + s.width * 0.55, s.y + s.height / 2, { steps: 14 });
      await rec.mouse.up();
    }
  }
  await rec.screenshot({ path: path.join(OUT, "20-walk-scrub.png") });
  const pathToggle = rec.locator("[data-testid=sw-path-toggle]");
  if (await pathToggle.count()) await pathToggle.click();
  await rec.waitForTimeout(800);
  await rec.screenshot({ path: path.join(OUT, "21-walk-path.png") });
  const station = rec.locator(".sw-path-crumb, [data-testid=sw-path-node]").first();
  if (await station.count()) await station.click({ force: true }).catch(() => undefined);
  await rec.waitForTimeout(800);
  const pin = rec.locator(".sw-pin").first();
  if (await pin.count()) await pin.click({ force: true }).catch(() => undefined);
  await rec.waitForTimeout(1200);
  await rec.screenshot({ path: path.join(OUT, "22-walk-pin.png") });
  await rec.close();
  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
