#!/usr/bin/env node
/**
 * Re-process an existing twin capture (sources already on R2).
 * After job completes, point an EXISTING model row at the fresh output key.
 *
 * Usage:
 *   node scripts/ops/reprocess-twin-capture.mjs --capture-id <uuid> --model-id <uuid>
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const POLL_MS = 30_000;
const MAX_WAIT_MS = 3 * 60 * 60_000;

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

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1]?.trim() : "";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

loadEnv(".env.local");

const captureId = arg("capture-id");
const modelId = arg("model-id");

if (!captureId || !modelId) {
  console.error("Usage: node scripts/ops/reprocess-twin-capture.mjs --capture-id <uuid> --model-id <uuid>");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const triggerKey = process.env.TRIGGER_SECRET_KEY;

if (!supabaseUrl || !serviceRole || !triggerKey) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or TRIGGER_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: capture, error: capErr } = await admin
  .from("digital_twin_captures")
  .select("id, org_id, space_id, project_id, created_by, title")
  .eq("id", captureId)
  .single();
if (capErr || !capture) {
  console.error("Capture not found:", capErr?.message ?? captureId);
  process.exit(1);
}

const { data: assets, error: assetErr } = await admin
  .from("digital_twin_capture_assets")
  .select("id, storage_key, asset_kind, file_size_bytes")
  .eq("capture_id", captureId)
  .eq("org_id", capture.org_id)
  .is("deleted_at", null);
if (assetErr || !assets?.length) {
  console.error("No assets for capture:", assetErr?.message ?? "empty");
  process.exit(1);
}

const { data: existingModel, error: modelErr } = await admin
  .from("digital_twin_models")
  .select("id, storage_key, space_id")
  .eq("id", modelId)
  .single();
if (modelErr || !existingModel) {
  console.error("Model not found:", modelErr?.message ?? modelId);
  process.exit(1);
}

const oldStorageKey = existingModel.storage_key;
console.log(`[reprocess] capture=${captureId} model=${modelId}`);
console.log(`[reprocess] old storage_key=${oldStorageKey}`);
console.log(`[reprocess] assets=${assets.map((a) => a.storage_key).join(", ")}`);

const assetIds = assets.map((a) => a.id);

const { data: job, error: jobErr } = await admin
  .from("digital_twin_processing_jobs")
  .insert({
    org_id: capture.org_id,
    space_id: capture.space_id,
    capture_id: capture.id,
    created_by: capture.created_by,
    job_type: "gaussian_splat",
    status: "queued",
    input_asset_ids: assetIds,
    output_format: "spz",
  })
  .select("id")
  .single();

if (jobErr || !job?.id) {
  console.error("Failed to create job:", jobErr?.message ?? "no row");
  process.exit(1);
}

console.log(`[reprocess] new job=${job.id} → fresh R2 key .../models/${job.id}.spz`);

const { tasks } = await import("@trigger.dev/sdk/v3");
const handle = await tasks.trigger(
  "twin.gaussian_splat",
  { jobId: job.id },
  undefined,
  { clientConfig: { previewBranch: "" } },
);
console.log(`[reprocess] trigger run=${handle?.id ?? "?"}`);

const started = Date.now();
let completedRow = null;

while (Date.now() - started < MAX_WAIT_MS) {
  await sleep(POLL_MS);
  const { data: row } = await admin
    .from("digital_twin_processing_jobs")
    .select("id, status, output_storage_key, output_model_id, error_text, worker_run_id")
    .eq("id", job.id)
    .single();

  if (!row) break;
  console.log(`[reprocess] poll status=${row.status} worker=${row.worker_run_id ?? "—"}`);

  if (row.status === "failed") {
    console.error("[reprocess] JOB FAILED:", row.error_text ?? "unknown");
    process.exit(1);
  }

  if (row.status === "completed") {
    completedRow = row;
    break;
  }
}

if (!completedRow?.output_storage_key) {
  console.error("[reprocess] Timed out or missing output_storage_key");
  process.exit(1);
}

const newKey = completedRow.output_storage_key;
if (newKey === oldStorageKey) {
  console.error("[reprocess] ERROR: output key matches old key — aborting to avoid in-place overwrite");
  process.exit(1);
}

const { data: callbackModel } = await admin
  .from("digital_twin_models")
  .select("id, storage_key, file_size_bytes, quality_metrics")
  .eq("id", completedRow.output_model_id)
  .maybeSingle();

const { error: updateErr } = await admin
  .from("digital_twin_models")
  .update({
    storage_key: newKey,
    file_size_bytes: callbackModel?.file_size_bytes ?? null,
    quality_metrics: callbackModel?.quality_metrics ?? {},
    processing_job_id: job.id,
    status: "ready",
  })
  .eq("id", modelId);

if (updateErr) {
  console.error("[reprocess] Failed to update model storage_key:", updateErr.message);
  process.exit(1);
}

if (callbackModel?.id && callbackModel.id !== modelId) {
  await admin
    .from("digital_twin_models")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", callbackModel.id);
  console.log(`[reprocess] archived duplicate callback model ${callbackModel.id}`);
}

await admin
  .from("digital_twin_spaces")
  .update({ published_model_id: modelId, status: "ready" })
  .eq("id", capture.space_id);

const qm = callbackModel?.quality_metrics ?? {};
console.log("\n[reprocess] SUCCESS");
console.log(JSON.stringify({
  jobId: job.id,
  matchingMethod: qm.matchingMethod ?? null,
  orientationMethod: qm.orientationMethod ?? null,
  splatCount: qm.splatCount ?? null,
  newStorageKey: newKey,
  oldStorageKey,
  modelId,
  spaceId: capture.space_id,
  twinUrl: `https://www.slate360.ai/digital-twin/twins/${capture.space_id}?v=${Date.now()}`,
}, null, 2));
