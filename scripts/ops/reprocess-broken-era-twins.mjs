#!/usr/bin/env node
/**
 * AF8: salvage the broken-era Digital Twin library now that ALIGNMENT_STRATEGY
 * defaults to colmap_first (Package P) and the A-FINAL hardening (AF1-AF11) is
 * live — COLMAP ignores the corrupted ARKit-bypass PLY seeds/poses entirely, so
 * old captures reconstructed by the broken bypass path ARE salvageable by
 * simply reprocessing them through the now-fixed normal pipeline.
 *
 * Two independent concerns, both dry-run by default:
 *
 *   A. Reprocess candidates — spaces whose CURRENT (latest-capture) model is
 *      still garbage. Detected from quality_metrics, no hardcoded space list:
 *        - alignmentPath is bypass/arkit_bypass, or lidarBypass === true
 *        - quality_metrics has no `alignmentStrategy` field at all (that field
 *          was added in this same deploy — its absence means the model
 *          predates Package P/A-FINAL, regardless of which path it used)
 *        - trainPsnr is a number below 17 (the AF1 fail threshold)
 *      Deduped to the LATEST capture per space (older captures in a space
 *      that's since been reprocessed are irrelevant).
 *
 *   B. Known experiment debris — model rows created by ad-hoc ops-script
 *      dispatches during the R4/R5/A/B rounds of this investigation. These
 *      are NOT detectable from quality_metrics alone (a real customer's
 *      genuinely low-quality first attempt looks identical in the data) — the
 *      list below is manually curated from this session's own record of what
 *      it created, not a heuristic. Archived via the same soft-delete the app
 *      uses (digital_twin_models.deleted_at/status, R2 cleanup enqueued),
 *      never a hard delete.
 *
 * IMPORTANT (verified by reading lib/twin/job-callback.ts, not by testing):
 * the completion callback only sets is_primary=true / published_model_id when
 * `existingModelCount === 0` for that space at insert time. Every reprocess
 * candidate here already has an existing (garbage) model, so the callback
 * will NOT auto-surface the new model — published_model_id stays pinned to
 * the OLD one. --execute therefore polls each dispatched job to completion
 * and applies the AF12 publish protocol (clear old is_primary -> set new
 * is_primary + published_model_id) itself; it does not rely on the callback.
 *
 * Usage:
 *   node scripts/ops/reprocess-broken-era-twins.mjs              # dry-run (default)
 *   node scripts/ops/reprocess-broken-era-twins.mjs --execute    # dispatch + archive
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const EXECUTE = process.argv.includes("--execute");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mirrors lib/twin/processing-credits.ts computeTwinProcessingCredits exactly
// (kept in sync manually — this is an ops script, not an app import).
const KIND_SURCHARGE = {
  video: 3, drone_video: 4, panorama_360: 4, ply_lidar: 5,
  lidar_depth: 4, lidar_mesh: 5, photo: 1, drone_photo: 2,
};
function estimateCredits(assets) {
  if (!assets.length) return 0;
  const totalBytes = assets.reduce((sum, a) => sum + Number(a.file_size_bytes ?? 0), 0);
  const gb = totalBytes / (1024 * 1024 * 1024);
  let credits = Math.max(1, Math.round(8 + gb * 35));
  for (const a of assets) credits += KIND_SURCHARGE[a.asset_kind] ?? 0;
  return Math.max(1, Math.round(credits)); // spz output, multiplier 1
}

// ── Known experiment debris (Section B) — manually curated, see docstring ──
const EXPERIMENT_DEBRIS = [
  { modelId: "dd08cc6a-deee-4dfa-bb16-fcea1e52f24e", note: "PART1-REVISED bypass arm (job eaa62849), PSNR 9.48, 4M-splat explosion — the original garbage that started this investigation" },
  { modelId: "aad8255c-2a23-41f7-abd2-8e31423bc291", note: "Package A' verification run (job 9f0d9519, post world-space-PLY fix), PSNR 10.86 — still garbage, superseded by the Swift depth-unprojection fix" },
  { modelId: "1aa2eba5-1eaf-41d5-927a-fc1aed578932", note: "R4.0 with-flip baseline on the dining-room capture, PSNR 10.92" },
  { modelId: "d8790df6-fd00-4dc4-bdb8-b4bc7c6b7350", note: "R4 ARM-A (no-ply, no-flip), PSNR 14.74" },
  { modelId: "8ee4a74e-2f39-4e53-9621-bc8ad98e2090", note: "R4 ARM-B (with-ply, no-flip), PSNR 14.29" },
  { modelId: "dc2ed650-1bf4-4edb-995d-994b6afff3e0", note: "R5 ARM-G (roll+90 diagnostic), PSNR 11.64 — roll hypothesis rejected" },
];
// Not included (informational only, no action available):
//   - Two PART-1 job rows (0270de0d-ee4b-401c-bcbe-0674bb6aea2f, 5cee25c4-6358-4c4c-b2f7-4415bf71bf7f)
//     timed out before producing a model — digital_twin_processing_jobs has no
//     deleted_at/soft-delete column, so there is nothing to archive; they are
//     inert job-history rows only, never rendered as a twin anywhere.
//   - 28b3fcd4-9c18-45f9-9ffc-bbb9b6acf5db (R5.0 draft COLMAP, PSNR 23.30):
//     coherent, not broken — merely superseded by the standard-quality P3/AF7
//     model. Left for Brian to archive separately if desired; not "debris."

async function loadCandidates() {
  // Walk spaces by their ACTUAL currently-published model (published_model_id,
  // falling back to is_primary) — NOT "any flagged model in this space" — so a
  // space already fixed by a later good reprocess (its published model isn't
  // flagged) is correctly excluded, even if an older, still-flagged model
  // happens to sit in the same space.
  const { data: spaces, error: spaceErr } = await admin
    .from("digital_twin_spaces")
    .select("id, org_id, title, published_model_id")
    .is("deleted_at", null);
  if (spaceErr) throw new Error(spaceErr.message);

  const debrisIds = new Set(EXPERIMENT_DEBRIS.map((d) => d.modelId));
  const candidates = [];

  for (const space of spaces ?? []) {
    let modelId = space.published_model_id;
    if (!modelId) {
      const { data: primary } = await admin
        .from("digital_twin_models")
        .select("id")
        .eq("space_id", space.id)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .maybeSingle();
      modelId = primary?.id ?? null;
    }
    if (!modelId || debrisIds.has(modelId)) continue;

    const { data: model } = await admin
      .from("digital_twin_models")
      .select("id, space_id, capture_id, org_id, quality_metrics, created_at")
      .eq("id", modelId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();
    if (!model) continue;

    const qm = model.quality_metrics ?? {};
    const bypassFlag = qm.alignmentPath === "bypass" || qm.alignmentPath === "arkit_bypass" || qm.lidarBypass === true;
    const predatesAFinal = qm.alignmentStrategy === undefined || qm.alignmentStrategy === null;
    const lowPsnr = typeof qm.trainPsnr === "number" && qm.trainPsnr < 17;
    if (bypassFlag || predatesAFinal || lowPsnr) {
      candidates.push({
        model,
        reasons: [
          bypassFlag ? "bypass_alignment" : null,
          predatesAFinal ? "predates_a_final" : null,
          lowPsnr ? `low_psnr(${qm.trainPsnr})` : null,
        ].filter(Boolean),
      });
    }
  }
  return candidates;
}

async function enrichCandidate(f) {
  const { data: capture } = await admin
    .from("digital_twin_captures")
    .select("id, title, created_at, org_id")
    .eq("id", f.model.capture_id)
    .maybeSingle();
  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title")
    .eq("id", f.model.space_id)
    .maybeSingle();
  const { data: assets } = await admin
    .from("digital_twin_capture_assets")
    .select("asset_kind, file_size_bytes")
    .eq("capture_id", f.model.capture_id)
    .eq("status", "ready")
    .is("deleted_at", null);

  return {
    ...f,
    capture,
    space,
    estCredits: estimateCredits(assets ?? []),
  };
}

console.log(EXECUTE ? "=== AF8 EXECUTE ===" : "=== AF8 DRY RUN (pass --execute to act) ===\n");

const candidates = await loadCandidates();
const enriched = await Promise.all(candidates.map(enrichCandidate));

console.log("SECTION A — Reprocess candidates (latest capture per space, still garbage):");
console.log(`  ${enriched.length} candidate space(s)\n`);
for (const c of enriched) {
  console.log(
    `  space="${c.space?.title ?? c.model.space_id}" capture="${c.capture?.title ?? c.model.capture_id}" ` +
    `capturedAt=${c.capture?.created_at ?? "?"} psnr=${c.model.quality_metrics?.trainPsnr ?? "n/a"} ` +
    `reasons=[${c.reasons.join(",")}] estCredits=${c.estCredits} currentModelId=${c.model.id}`,
  );
}

console.log("\nSECTION B — Known experiment debris (manually curated, see script docstring):");
console.log(`  ${EXPERIMENT_DEBRIS.length} model(s)\n`);
for (const d of EXPERIMENT_DEBRIS) {
  console.log(`  modelId=${d.modelId} — ${d.note}`);
}

if (!EXECUTE) {
  console.log("\nDry run only. Re-run with --execute to dispatch Section A reprocess jobs (standard quality, normal path) and archive Section B debris.");
  process.exit(0);
}

// ── --execute: Section A — dispatch through the normal path (queued + tasks.trigger) ──
console.log("\n=== Dispatching Section A reprocess jobs ===");
const { tasks } = await import("@trigger.dev/sdk/v3");
const dispatched = [];
for (const c of enriched) {
  const { data: assets } = await admin
    .from("digital_twin_capture_assets")
    .select("id")
    .eq("capture_id", c.model.capture_id)
    .eq("status", "ready")
    .is("deleted_at", null);
  if (!assets?.length) {
    console.error(`  SKIP space=${c.space?.title}: no ready assets for capture ${c.model.capture_id}`);
    continue;
  }
  const { data: capture } = await admin
    .from("digital_twin_captures")
    .select("org_id, created_by")
    .eq("id", c.model.capture_id)
    .single();

  const { data: job, error: jobErr } = await admin
    .from("digital_twin_processing_jobs")
    .insert({
      org_id: capture.org_id,
      space_id: c.model.space_id,
      capture_id: c.model.capture_id,
      created_by: capture.created_by,
      job_type: "gaussian_splat",
      status: "queued",
      input_asset_ids: assets.map((a) => a.id),
      output_format: "spz",
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    console.error(`  FAILED to insert job for space=${c.space?.title}: ${jobErr?.message}`);
    continue;
  }
  const handle = await tasks.trigger(
    "twin.gaussian_splat",
    { jobId: job.id, quality: "standard" },
    undefined,
    { clientConfig: { previewBranch: "" } },
  );
  console.log(`  dispatched space="${c.space?.title}" job=${job.id} run=${handle?.id ?? "?"}`);
  dispatched.push({ ...c, jobId: job.id });
}

// Poll all dispatched jobs to terminal, then apply AF12 publish for each success.
console.log("\n=== Polling reprocess jobs to terminal status ===");
const POLL_MS = 30_000;
const MAX_WAIT_MS = 3 * 60 * 60_000;
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
const pending = new Map(dispatched.map((d) => [d.jobId, d]));
const results = [];
const started = Date.now();
while (pending.size && Date.now() - started < MAX_WAIT_MS) {
  await sleep(POLL_MS);
  for (const [jobId, c] of [...pending.entries()]) {
    const { data: row } = await admin
      .from("digital_twin_processing_jobs")
      .select("id, status, output_model_id, error_text")
      .eq("id", jobId)
      .single();
    if (!row) continue;
    if (row.status === "completed" || row.status === "failed") {
      results.push({ ...c, row });
      pending.delete(jobId);
    }
  }
}
for (const jobId of pending.keys()) {
  console.error(`  TIMED OUT waiting for job ${jobId}`);
}

console.log("\n=== AF12 publish for completed reprocess jobs ===");
for (const r of results) {
  if (r.row.status === "failed") {
    console.error(`  space="${r.space?.title}" job=${r.jobId} FAILED: ${r.row.error_text} — old model left published`);
    continue;
  }
  const newModelId = r.row.output_model_id;
  await admin.from("digital_twin_models").update({ is_primary: false }).eq("id", r.model.id);
  await admin.from("digital_twin_models").update({ is_primary: true }).eq("id", newModelId);
  await admin.from("digital_twin_spaces").update({ published_model_id: newModelId }).eq("id", r.model.space_id);
  console.log(`  space="${r.space?.title}" published new model ${newModelId} (was ${r.model.id})`);
}

// ── --execute: Section B — archive debris via the app's soft-delete pattern ──
console.log("\n=== Archiving Section B experiment debris ===");
for (const d of EXPERIMENT_DEBRIS) {
  const { data: model } = await admin
    .from("digital_twin_models")
    .select("id, org_id, storage_key, preview_storage_key, file_size_bytes, deleted_at, is_primary")
    .eq("id", d.modelId)
    .maybeSingle();
  if (!model) {
    console.log(`  SKIP ${d.modelId}: not found`);
    continue;
  }
  if (model.deleted_at) {
    console.log(`  SKIP ${d.modelId}: already archived`);
    continue;
  }
  if (model.is_primary) {
    console.error(`  SKIP ${d.modelId}: is_primary=true — would orphan the space's publish pointer, archive manually if intended`);
    continue;
  }
  await admin
    .from("digital_twin_models")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", d.modelId);
  for (const key of [model.storage_key, model.preview_storage_key].filter(Boolean)) {
    await admin.rpc("enqueue_digital_twin_r2_cleanup", {
      p_org_id: model.org_id,
      p_storage_key: key,
      p_bytes_freed: key === model.storage_key ? Number(model.file_size_bytes) || 0 : 0,
      p_source_table: "digital_twin_models",
      p_source_id: d.modelId,
    });
  }
  console.log(`  archived ${d.modelId}`);
}
