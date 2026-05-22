#!/usr/bin/env node
/**
 * Capture V2 code preflight — validates committed core-loop scaffolding.
 * Usage: node scripts/ops/preflight-capture-v2-code.mjs
 *
 * Scope: V1 fallback + Capture V2 shell/orchestrator (flag off by default).
 * Ghost Mode timeline API is future work — not required for core-loop pass.
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
  "components/capture-v2/capture-v2-state-machine.ts",
  "components/capture-v2/useCaptureV2Loop.ts",
  "components/capture-v2/CaptureV2Orchestrator.tsx",
  "components/capture-v2/CaptureV2Shell.tsx",
  "app/api/site-walk/nearby/route.ts",
  "lib/mobile-route-policy.ts",
  "components/shared/MobileBottomNav.tsx",
  "components/dashboard/AppShell.tsx",
];

/** Not required for current Capture V2 core loop — report status only. */
const FUTURE_GHOST_MODE_FILES = [
  {
    rel: "app/api/site-walk/items/timeline/route.ts",
    note: "Ghost Mode / location-history feed (Prompt 6+) — uncommitted on main is OK",
  },
  {
    rel: "lib/site-walk/enrich-nearby-items.ts",
    note: "Author enrichment for timeline/nearby enhancements — optional until API slice lands",
  },
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

console.log("Capture V2 code preflight (committed core-loop scope)\n");

console.log("Required assets:\n");
for (const rel of REQUIRED_FILES) {
  if (exists(rel)) pass(rel);
  else fail(rel);
}

console.log("\nFuture / Ghost Mode assets (informational — not required yet):\n");
for (const { rel, note } of FUTURE_GHOST_MODE_FILES) {
  const present = exists(rel);
  console.log(`  [${present ? "PRESENT" : "NOT YET"}] ${rel}`);
  console.log(`           ${note}`);
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

console.log("\nFeature flag default (V1 fallback must stay default):\n");
if (
  fileContains("lib/site-walk/capture-v2-config.ts", 'process.env.NEXT_PUBLIC_CAPTURE_V2 === "true"') &&
  fileContains(".env.example", 'NEXT_PUBLIC_CAPTURE_V2="false"')
) {
  pass("CAPTURE_V2_ENABLED opt-in only; .env.example defaults false");
} else {
  fail("capture-v2-config or .env.example flag default");
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

if (
  exists("components/capture-v2/CaptureV2Orchestrator.tsx") &&
  fileContains("components/capture-v2/CaptureV2Orchestrator.tsx", "useCaptureV2Loop")
) {
  pass("CaptureV2Orchestrator wires useCaptureV2Loop");
} else {
  fail("CaptureV2Orchestrator core loop wiring");
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

console.log("\nPreflight OK — committed Capture V2 core-loop scope verified.");
console.log("Timeline API is optional until Ghost Mode slice (Prompt 6+).");
process.exit(0);
