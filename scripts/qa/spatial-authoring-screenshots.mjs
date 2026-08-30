/**
 * HouseWalk authoring screenshots. Uses /preview/spatial-authoring (real share media).
 * Token from SPATIAL_SHARE_TOKEN or .spatial-rc1-share.json — never logged.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3011";
const outDir = path.join(process.cwd(), ".brand-audit", "spatial-authoring");

async function loadToken() {
  if (process.env.SPATIAL_SHARE_TOKEN) return process.env.SPATIAL_SHARE_TOKEN;
  try {
    const raw = await readFile(path.join(process.cwd(), ".spatial-rc1-share.json"), "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.token === "string" ? parsed.token : "";
  } catch {
    return "";
  }
}

const scenes = [
  { id: "01-timeline", scene: "timeline", w: 1440, h: 900 },
  { id: "02-excluded-interval", scene: "exclude", w: 1440, h: 900 },
  { id: "03-operator-normal", scene: "operator-normal", w: 1440, h: 900 },
  { id: "04-operator-doorway", scene: "operator-door", w: 1440, h: 900 },
  { id: "05-privacy-review", scene: "review", w: 1440, h: 900 },
  { id: "06-orientation", scene: "orientation", w: 1440, h: 900 },
  { id: "08-mobile-review", scene: "timeline", w: 390, h: 844 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const token = await loadToken();
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });

  for (const item of scenes) {
    const page = await browser.newPage({ viewport: { width: item.w, height: item.h } });
    await page.goto(`${base}/preview/spatial-authoring?scene=${item.scene}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.locator("[data-testid='sw-authoring-preview']").waitFor({ timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2800);
    if (item.scene === "orientation" || item.scene === "review") {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(outDir, `${item.id}.png`), fullPage: item.scene === "orientation" || item.scene === "review" });
    await page.close();
    console.log(item.id);
  }

  if (token) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/w/${token}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.locator("[data-testid='sw-poster-gate']").waitFor({ timeout: 20000 }).catch(() => undefined);
    const play = page.locator("[data-testid='sw-poster-gate'] button");
    if (await play.count()) await play.click();
    await page.waitForTimeout(4500);
    await page.mouse.move(420, 260);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "07-client-preview.png"), fullPage: false });
    await page.close();
    console.log("07-client-preview");
  }

  await browser.close();
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
