/**
 * Build artifact_manifest.json from the local AOB205 capture folder.
 * Client files only: ERP JPEGs + PDFs. No INSV / DNG / master MP4 / LRV.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const root = process.argv[2] || "C:\\Users\\bcvol\\OneDrive\\Desktop\\360 car\\AOB205";
const files = readdirSync(root);
const artifacts = [];

for (const name of files.filter((f) => /^IMG_.*\.jpg$/i.test(f)).sort()) {
  const stationId = name.match(/_(\d{3})\.jpg$/i)?.[1];
  if (!stationId) continue;
  artifacts.push({
    id: `st-${stationId}`,
    kind: "station_erp",
    path: name,
    role: "client",
    contentType: "image/jpeg",
    stationId: `AOB205-20260817-${stationId}`,
  });
}

const plan = files.find((f) => f === "918A0025.pdf");
if (plan) {
  artifacts.push({
    id: "plan",
    kind: "plan_pdf",
    path: plan,
    role: "client",
    contentType: "application/pdf",
  });
}

for (const name of files.filter((f) => /\.pdf$/i.test(f) && f !== "918A0025.pdf" && f !== "918A0025 (1).pdf").sort()) {
  artifacts.push({
    id: `doc-${basename(name, ".pdf").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`,
    kind: "document",
    path: name,
    role: "client",
    contentType: "application/pdf",
  });
}

const manifest = {
  version: 1,
  projectKey: "AOB205",
  visitDate: "2026-08-17",
  title: "AOB205 — August 17 visit",
  building: "AOB205",
  floor: "Level 1",
  artifacts,
  planControls: [
    { pathX: 0, pathY: 0, planU: 0.12, planV: 0.8 },
    { pathX: 8.4, pathY: 0.2, planU: 0.71, planV: 0.78 },
    { pathX: 8.1, pathY: 6, planU: 0.69, planV: 0.22 },
  ],
};

const out = resolve(root, "artifact_manifest.json");
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ out, artifacts: artifacts.length, stations: artifacts.filter((a) => a.kind === "station_erp").length }, null, 2));
