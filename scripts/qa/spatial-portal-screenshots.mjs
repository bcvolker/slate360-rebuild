import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SPATIAL_PORTAL_BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.resolve("docs/qa/spatial-portal-screenshots");

const SCENES = ["home", "overview", "library", "viewer", "files", "sharing"];
const ORGS = ["spatial-only", "multi"];

async function shot(page, org, scene, viewport) {
  const url = `${BASE}/preview/spatial-portal?org=${org}&scene=${scene}`;
  await page.goto(url, { waitUntil: "networkidle" });
  const file = path.join(OUT, `${org}-${viewport.name}-${scene}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const paths = [];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    for (const org of ORGS) {
      for (const scene of SCENES) {
        paths.push(await shot(page, org, scene, viewport));
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(paths.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
