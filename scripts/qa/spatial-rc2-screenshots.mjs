/**
 * RC2 screenshots. Tokens from .spatial-rc2-share.json / .spatial-rc1-share.json. Never logged.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL;
if (!base) {
  console.error("preview base required");
  process.exit(1);
}
const outDir = path.join(process.cwd(), ".spatial-rc2-review");

async function readJson(file) {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), file), "utf8"));
  } catch {
    return {};
  }
}

async function shot(page, dest) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: dest, fullPage: false });
}

async function open(browser, url, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(900);
  return page;
}

async function enterWalk(page) {
  const play = page.locator("[data-testid='sw-poster-gate'] button");
  if (await play.count()) await play.click();
  await page.waitForTimeout(2400);
}

async function clickText(page, re) {
  const loc = page.getByText(re).first();
  if (await loc.count()) await loc.click({ timeout: 4000 }).catch(() => undefined);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "desktop"), { recursive: true });
  await mkdir(path.join(outDir, "mobile"), { recursive: true });
  const rc2 = await readJson(".spatial-rc2-share.json");
  const rc1 = await readJson(".spatial-rc1-share.json");
  const clientToken = rc1.token || "";
  const publicToken = rc2.publicToken || "";
  const accessToken = rc2.accessToken || "";
  const accessCode = rc2.accessCode || "";

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });

  const desktop = [
    { id: "01-library", url: `${base}/preview/spatial-walkthrough?scene=library` },
    { id: "02-authoring-clean", url: `${base}/preview/spatial-privacy?view=authoring` },
    { id: "03-timeline", url: `${base}/preview/spatial-privacy?view=authoring` },
    { id: "04-doorway-keyframe", url: `${base}/preview/spatial-privacy?view=authoring` },
    { id: "05-orientation", url: `${base}/preview/spatial-privacy?view=authoring` },
    { id: "06-privacy-review", url: `${base}/preview/spatial-privacy?view=authoring` },
    { id: "14-export", url: `${base}/preview/spatial-privacy?view=export` },
    { id: "09-chapter-picker", url: `${base}/preview/spatial-chapters` },
  ];

  for (const item of desktop) {
    const page = await open(browser, item.url, 1440, 900);
    await shot(page, path.join(outDir, "desktop", `${item.id}.png`));
    const mobile = await open(browser, item.url, 390, 844);
    await shot(mobile, path.join(outDir, "mobile", `${item.id}.png`));
    await page.close();
    await mobile.close();
    console.log(item.id);
  }

  if (clientToken) {
    const share = `${base}/w/${clientToken}`;
    const d = await open(browser, share, 1440, 900);
    await enterWalk(d);
    await clickText(d, /Explore/i);
    await shot(d, path.join(outDir, "desktop", "07-explore-hud.png"));
    await clickText(d, /Play Walk|Play/i);
    await d.waitForTimeout(1500);
    await shot(d, path.join(outDir, "desktop", "08-play-walk.png"));
    await shot(d, path.join(outDir, "desktop", "10-client-share.png"));
    await d.close();
    const m = await open(browser, share, 390, 844);
    await enterWalk(m);
    await shot(m, path.join(outDir, "mobile", "12-mobile-viewer.png"));
    await m.close();
    console.log("client share");
  }

  if (publicToken) {
    const share = `${base}/w/${publicToken}`;
    const d = await open(browser, share, 1440, 900);
    await enterWalk(d);
    await shot(d, path.join(outDir, "desktop", "11-public-share.png"));
    await d.close();
    const m = await open(browser, share, 390, 844);
    await shot(m, path.join(outDir, "mobile", "11-public-share.png"));
    await m.close();
    console.log("public share");
  }

  if (accessToken) {
    const share = `${base}/w/${accessToken}`;
    const d = await open(browser, share, 1440, 900);
    const input = d.locator("input[type='password'], input[type='text']").first();
    if (await input.count()) {
      await input.fill(accessCode);
      await d.getByRole("button").first().click().catch(() => undefined);
      await d.waitForTimeout(1200);
    }
    await shot(d, path.join(outDir, "desktop", "13-access-code.png"));
    await d.close();
    const m = await open(browser, share, 390, 844);
    await shot(m, path.join(outDir, "mobile", "13-access-code.png"));
    await m.close();
    console.log("access-code share");
  }

  await browser.close();
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
