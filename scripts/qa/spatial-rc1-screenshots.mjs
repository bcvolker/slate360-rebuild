/**
 * RC1 screenshots against the real HouseWalk share + preview harnesses.
 * Token is read from env SPATIAL_SHARE_TOKEN or .spatial-rc1-share.json (never logged).
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "docs", "qa", "spatial-rc1-screenshots");

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

const shots = [
  { id: "01-library", url: `${base}/preview/spatial-walkthrough?scene=library`, w: 1440, h: 900 },
  { id: "02-authoring-clean", url: `${base}/preview/spatial-privacy?view=authoring`, w: 1440, h: 900 },
  { id: "03-waypoint", url: `${base}/preview/spatial-walkthrough?scene=waypoint`, w: 1440, h: 900 },
  { id: "04-pin-drawer", url: `${base}/preview/spatial-walkthrough?scene=pdf-drawer`, w: 1440, h: 900 },
  { id: "05-branding", url: `${base}/preview/spatial-walkthrough?scene=brand-editor`, w: 1440, h: 900 },
  { id: "06-operator-mask", url: `${base}/preview/spatial-privacy?view=authoring`, w: 1440, h: 900 },
  { id: "07-client-portal", url: `${base}/preview/spatial-portal?scene=home`, w: 1440, h: 900 },
  { id: "10-access-code", url: `${base}/preview/spatial-privacy?view=access-code`, w: 1440, h: 900 },
  { id: "11-export", url: `${base}/preview/spatial-privacy?view=export`, w: 1440, h: 900 },
  { id: "12-mobile-portal", url: `${base}/preview/spatial-portal?scene=home`, w: 390, h: 844 },
];

async function shot(page, dest) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: dest, fullPage: false });
}

async function openShare(browser, shareUrl, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(shareUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator("[data-testid='sw-poster-gate']").waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  return page;
}

async function enterWalkthrough(page) {
  await page.mouse.move(240, 180);
  const play = page.locator("[data-testid='sw-poster-gate'] button");
  if (await play.count()) await play.click();
  await page.mouse.move(420, 260);
  await page.waitForTimeout(2200);
  await page.mouse.move(280, 200);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const token = await loadToken();
const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  for (const item of shots) {
    const page = await browser.newPage({ viewport: { width: item.w, height: item.h } });
    await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await shot(page, path.join(outDir, `${item.id}.png`));
    await page.close();
    console.log(item.id);
  }

  if (token) {
    const share = `${base}/w/${token}`;
    const desktop = await openShare(browser, share, 1440, 900);
    await shot(desktop, path.join(outDir, "08-client-viewer-before-play.png"));
    await enterWalkthrough(desktop);
    await shot(desktop, path.join(outDir, "09-client-viewer-playing.png"));
    await desktop.close();
    console.log("08-09 share desktop");

    const mobile = await openShare(browser, share, 390, 844);
    await shot(mobile, path.join(outDir, "13-mobile-viewer-before-play.png"));
    await enterWalkthrough(mobile);
    await shot(mobile, path.join(outDir, "14-mobile-viewer-playing.png"));
    await mobile.mouse.click(200, 420);
    await mobile.waitForTimeout(400);
    await shot(mobile, path.join(outDir, "15-mobile-pin-drawer.png"));
    await mobile.close();
    console.log("13-15 share mobile");
  } else {
    console.log("no share token; skipped real-media viewer frames");
  }

  await browser.close();
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
