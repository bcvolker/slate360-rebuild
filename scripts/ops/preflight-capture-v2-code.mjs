#!/usr/bin/env node
/**
 * Capture V2 code preflight — validates routing, launch wiring, and shell policy.
 * Usage: node scripts/ops/preflight-capture-v2-code.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_FILES = [
  "lib/site-walk/item-filters.ts",
  "lib/site-walk/capture-v2-routes.ts",
  "lib/site-walk/capture-v2-config.ts",
  "lib/site-walk/site-walk-shell-paths.ts",
  "lib/utils/trigger-haptic.ts",
  "components/capture-v2/types.ts",
  "components/capture-v2/layers.ts",
  "components/capture-v2/index.ts",
  "app/api/site-walk/nearby/route.ts",
  "app/api/site-walk/items/timeline/route.ts",
  "lib/mobile-route-policy.ts",
  "components/shared/MobileBottomNav.tsx",
  "components/dashboard/AppShell.tsx",
];

/** Launch surfaces that must call buildCaptureLaunchUrl / buildWalkResumeUrl (hub removed in V1 shell). */
const LAUNCH_WIRING = [
  "components/site-walk/SiteWalkHomeClient.tsx",
  "app/site-walk/(act-1-setup)/setup/_components/StartWalkForm.tsx",
  "app/site-walk/(act-2-inputs)/walks/page.tsx",
  "app/site-walk/(act-2-inputs)/walks/[sessionId]/page.tsx",
];

const V2_ROUTE_FILES = [
  "app/site-walk/capture-v2/layout.tsx",
  "app/site-walk/capture-v2/page.tsx",
  "app/site-walk/capture-v2/summary/layout.tsx",
  "app/site-walk/capture-v2/summary/page.tsx",
];

/** Legacy hub files removed when Site Walk V1 shell shipped — must stay absent. */
const REMOVED_LEGACY_HUB = [
  "app/site-walk/_components/WalkActionsMenu.tsx",
  "app/site-walk/_components/SiteWalkHub.tsx",
];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fileContains(rel, needle) {
  return read(rel).includes(needle);
}

function usesCaptureV2Config(rel) {
  const text = read(rel);
  return (
    text.includes("capture-v2-config") &&
    (text.includes("buildCaptureLaunchUrl") || text.includes("buildWalkResumeUrl"))
  );
}

let failed = 0;

function pass(label) {
  console.log(`  [PASS] ${label}`);
}

function fail(label) {
  console.log(`  [FAIL] ${label}`);
  failed++;
}

console.log("Capture V2 code preflight\n");

console.log("Required assets:\n");
for (const rel of REQUIRED_FILES) {
  if (exists(rel)) pass(rel);
  else fail(rel);
}

console.log("\nLaunch URL wiring (buildCaptureLaunchUrl / buildWalkResumeUrl):\n");
for (const rel of LAUNCH_WIRING) {
  const ok = exists(rel) && usesCaptureV2Config(rel);
  if (ok) pass(rel);
  else fail(rel);
}

console.log("\nLegacy hub removal (must not return):\n");
for (const rel of REMOVED_LEGACY_HUB) {
  if (!exists(rel)) pass(`removed ${rel}`);
  else fail(`still present ${rel}`);
}

console.log("\nFull-bleed / capture path policy:\n");
if (
  fileContains("lib/site-walk/capture-v2-routes.ts", "isSiteWalkCaptureV2Path") &&
  fileContains("lib/site-walk/site-walk-shell-paths.ts", "isSiteWalkCaptureV2Path") &&
  fileContains("components/dashboard/AppShell.tsx", "isSiteWalkFullBleedPath")
) {
  pass("V2 paths via site-walk-shell-paths; AppShell uses isSiteWalkFullBleedPath");
} else {
  fail("full-bleed policy — capture-v2-routes + shell-paths + AppShell");
}

if (fileContains("lib/mobile-route-policy.ts", "MOBILE_SITE_WALK_CAPTURE_V2_PREFIX")) {
  pass("capture-v2 excluded from mobile legacy quarantine");
} else {
  fail("mobile-route-policy missing MOBILE_SITE_WALK_CAPTURE_V2_PREFIX");
}

const homeClient = exists("components/site-walk/SiteWalkHomeClient.tsx")
  ? read("components/site-walk/SiteWalkHomeClient.tsx")
  : "";
if (
  homeClient.includes('router.push("/site-walk/slatedrop")') ||
  homeClient.includes('router.push("/site-walk/deliverables")')
) {
  fail("SiteWalkHomeClient still router.push to mobile-quarantined sub-routes");
} else {
  pass("SiteWalkHomeClient uses in-shell tabs for slatedrop/deliverables");
}

console.log("\nCapture V2 UI routes:\n");
for (const rel of V2_ROUTE_FILES) {
  const present = exists(rel);
  console.log(`  [${present ? "READY" : "PENDING"}] ${rel}`);
  if (!present) failed++;
}

if (failed > 0) {
  console.log(`\n${failed} preflight check(s) failed.`);
  process.exit(1);
}

console.log("\nPreflight OK — Capture V2 scaffolding and routing policy verified.");
process.exit(0);
