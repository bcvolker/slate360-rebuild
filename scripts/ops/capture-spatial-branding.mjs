/**
 * Capture Spatial Walkthrough branding screenshots into .brand-audit/ (gitignored).
 * Usage: node scripts/ops/capture-spatial-branding.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2] || process.env.PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), ".brand-audit", "spatial-walkthrough");

const shots = [
  { id: "01-library", scene: "library", width: 1440, height: 900 },
  { id: "02-viewer", scene: "viewer", width: 1440, height: 900 },
  { id: "03-waypoint", scene: "waypoint", width: 1440, height: 900 },
  { id: "04-document-pin", scene: "document-pin", width: 1440, height: 900 },
  { id: "05-pdf-drawer", scene: "pdf-drawer", width: 1440, height: 900 },
  { id: "06-brand-editor", scene: "brand-editor", width: 1440, height: 900 },
  { id: "07-share-modal", scene: "share-modal", width: 1440, height: 900 },
  { id: "08-library-mobile", scene: "library", width: 390, height: 844 },
  { id: "09-viewer-mobile", scene: "viewer", width: 390, height: 844 },
  { id: "10-pin-drawer-mobile", scene: "pin-drawer", width: 390, height: 844 },
  { id: "11-timeline-mobile", scene: "timeline", width: 390, height: 844 },
  { id: "12-access-code", scene: "access-code", width: 390, height: 844 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const paths = [];
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    const url = `${base}/preview/spatial-walkthrough?scene=${shot.scene}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(400);
    const dest = path.join(outDir, `${shot.id}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    paths.push(dest);
    await page.close();
  }

  const cards = shots
    .map((s, i) => `<figure><img src="${s.id}.png" alt="${s.id}"/><figcaption>${String(i + 1).padStart(2, "0")} ${s.id}</figcaption></figure>`)
    .join("");
  const htmlPath = path.join(outDir, "montage.html");
  await writeFile(htmlPath, `<!doctype html><html><head><style>
    body{margin:0;background:#0b0f15;color:#f8fafc;font:12px/1.3 ui-sans-serif,system-ui}
    h1{margin:16px 24px;font-size:18px;font-weight:600}
    main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px 24px 32px}
    figure{margin:0;border:1px solid rgba(255,255,255,.1)}
    img{width:100%;height:180px;object-fit:cover;display:block;background:#111}
    figcaption{padding:6px 8px;color:#a3aed0}
  </style></head><body><h1>Spatial Walkthrough — design review</h1><main>${cards}</main></body></html>`);
  const montage = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  await montage.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  const montagePath = path.join(outDir, "00-montage-1440.png");
  await montage.screenshot({ path: montagePath, fullPage: true });
  await browser.close();
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify({ base, paths: [...paths, montagePath] }, null, 2));
  console.log(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
