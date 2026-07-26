#!/usr/bin/env node
/**
 * List benchmark-candidate twin captures that ALREADY EXIST in the database.
 *
 * Purpose: Phase 0/1 A/B arms need a fixed benchmark set, and every capture we need has
 * already been shot — no new field collection is required. This prints the candidates,
 * grouped by the role each plays in the benchmark set, with the exact dispatch command
 * for each.
 *
 * Usage (from a machine with backend credentials, e.g. C:\s360):
 *   node scripts/ops/list-twin-benchmarks.mjs
 *   node scripts/ops/list-twin-benchmarks.mjs --limit 40
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Read-only — performs no writes and dispatches nothing.
 */

import { createClient } from "@supabase/supabase-js";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const limit = Number(arg("limit") ?? 30);
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: models, error } = await db
  .from("digital_twin_models")
  .select("id, space_id, storage_key, quality_metrics, created_at, is_primary, status")
  .eq("status", "ready")
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(limit);

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = [];
for (const m of models ?? []) {
  const q = m.quality_metrics ?? {};
  const psnr = typeof q.trainPsnr === "number" ? q.trainPsnr : null;
  const { data: cap } = await db
    .from("digital_twin_captures")
    .select("id, title, device_class, has_lidar, asset_counts, created_at")
    .eq("space_id", m.space_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  rows.push({
    captureId: cap?.id ?? null,
    title: cap?.title ?? "(untitled)",
    device: cap?.device_class ?? "?",
    lidar: cap?.has_lidar ? "yes" : "no",
    psnr,
    scale: q.scaleFactor ? "applied" : (q.scaleSkipped ?? "n/a"),
    orientation: q.measuredOrientationApplied ? "measured" : "pca/unknown",
    alignment: q.alignmentPath ?? q.alignmentStrategy ?? "?",
    created: (cap?.created_at ?? m.created_at ?? "").slice(0, 10),
  });
}

const withPsnr = rows.filter((r) => r.psnr !== null && r.captureId);
const best = [...withPsnr].sort((a, b) => b.psnr - a.psnr)[0];
const worst = [...withPsnr].sort((a, b) => a.psnr - b.psnr)[0];

console.log("\n=== Twin benchmark candidates (already captured — no new collection needed) ===\n");
console.table(
  rows.map((r) => ({
    capture: r.captureId ? r.captureId.slice(0, 8) : "—",
    title: r.title.slice(0, 28),
    device: r.device,
    lidar: r.lidar,
    psnr: r.psnr === null ? "—" : r.psnr.toFixed(2),
    scale: String(r.scale).slice(0, 22),
    orient: r.orientation,
    date: r.created,
  })),
);

console.log("\nSuggested benchmark set:");
if (best) console.log(`  REGRESSION GUARD (best PSNR ${best.psnr.toFixed(2)}): ${best.captureId}`);
if (worst) console.log(`  HARD CASE       (worst PSNR ${worst.psnr.toFixed(2)}): ${worst.captureId}`);
console.log("  Also pick, by title/date: the iPhone+Insta360 X4 dual capture, and a drone set.\n");

console.log("Then run each arm (baseline first, then quality):");
if (best) {
  console.log(
    `  node scripts/ops/dispatch-twin-experiment.mjs --capture-id ${best.captureId} --arm colmap --train-profile baseline --quality draft`,
  );
  console.log(
    `  node scripts/ops/dispatch-twin-experiment.mjs --capture-id ${best.captureId} --arm colmap --train-profile quality  --quality draft`,
  );
}
console.log(
  "\nR7.5 reminder: metrics are NOT sufficient — open both share links in a browser and compare visually before promoting an arm.\n",
);
