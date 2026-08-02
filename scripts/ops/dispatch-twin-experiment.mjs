#!/usr/bin/env node
/**
 * Direct-to-Modal A/B experiment dispatch (bypasses Trigger.dev's claim path).
 * Inserts a job row already in "processing" and POSTs straight to
 * MODAL_TWIN_ENDPOINT, mirroring src/trigger/twin-gaussian-splat.ts's asset
 * partitioning + payload shape. The worker's completion/failure callback
 * (lib/twin/job-callback.ts) handles the terminal transition normally.
 *
 * Usage:
 *   node scripts/ops/dispatch-twin-experiment.mjs --capture-id <uuid> [--arm <bypass|colmap>] \
 *     [--align-backend <colmap_vanilla|colmap_pose_prior>] \
 *     [--tolerance-sec <float>] [--quality draft|standard] [--speed fast|standard] \
 *     [--train-profile baseline|quality] [--poll] \
 *     [--asset-id <uuid>] [--no-ply] [--debug] [--roll-deg <float>] [--publish]
 *
 * --no-ply omits lidarPlyKey from the dispatch payload even if a ply_lidar asset
 *   exists, isolating the pose/conversion path from the PLY-seed path.
 * --debug sets debugArtifacts:true so the worker uploads the processed
 *   transforms.json to the job's R2 sibling key for offline inspection.
 * --roll-deg sets rollCorrectionDeg — a diagnostic camera-local roll (degrees)
 *   about the optical axis applied to every ARKit-bypass c2w.
 * --publish (AF12): poll the job to terminal status, and on success apply the
 *   permanent publish protocol — clear is_primary on the space's currently
 *   published model, set the new model is_primary + published_model_id, verify
 *   via the same resolution logic the viewers use, and print a "refresh your
 *   share link" reminder. On failure, reports the error and does NOT touch the
 *   published model.
 *
 * R7.5 (permanent visual gate — READ BEFORE TREATING A --publish RUN AS DONE):
 *   metrics-only acceptance (PSNR/quality_metrics looking healthy) is NOT
 *   sufficient to call a publish complete. R7 shipped a case where a metrics
 *   bug (scaleSkipped="insufficient_pairs(0)" from a silent filename-join
 *   mismatch) hid a SEPARATE, more dangerous bug (a linear multiply on
 *   log-encoded gaussian scale_0/1/2 properties, which would have produced
 *   giant/exploded splats — "the giant blobs" — the moment scale recovery
 *   ever actually succeeded) from ever being exercised or caught by metrics
 *   review alone. This script prints the metrics; it does NOT open the share
 *   link. Before reporting a --publish run as complete, separately open the
 *   resulting share link in a browser and describe what actually renders
 *   ("opens framed on a recognizable subject" or equivalent) — do not skip
 *   this step even when quality_metrics look perfect.
 */

import fs from "node:fs";
import { randomBytes } from "node:crypto";
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

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1]?.trim() : "";
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

loadEnv(".env.local");

const captureId = arg("capture-id");
const requestedArm = arg("arm");
const alignBackend = arg("align-backend");
const arm = requestedArm || "bypass";
const reportLabel = arg("report-label", "Interior acceptance run");
// P0d — training-profile arm. "baseline" reproduces current production behaviour;
// "quality" enables the nerfstudio 1.1.5 flags that were never switched on
// (bilateral grid, antialiased raster, SO3xR3 camera optimizer, denser densification).
const trainProfile = arg("train-profile");
const toleranceSecRaw = arg("tolerance-sec");
const quality = arg("quality") || "draft";
const speed = arg("speed") || "fast";
const noPly = flag("no-ply");
const onlyAssetId = arg("asset-id");
const debugArtifacts = flag("debug");
const rollDegRaw = arg("roll-deg");
const rollCorrectionDeg = rollDegRaw ? Number(rollDegRaw) : undefined;
if (rollDegRaw && !Number.isFinite(rollCorrectionDeg)) {
  console.error(`Invalid --roll-deg "${rollDegRaw}"`);
  process.exit(1);
}
const shouldPublish = flag("publish");
const shouldPoll = flag("poll") || shouldPublish;

if (!captureId || (requestedArm && arm !== "bypass" && arm !== "colmap")) {
  console.error(
    "Usage: node scripts/ops/dispatch-twin-experiment.mjs --capture-id <uuid> " +
      "[--arm <bypass|colmap>] [--align-backend <colmap_vanilla|colmap_pose_prior>] " +
      "[--tolerance-sec <float>] [--quality draft|standard] [--speed fast|standard]",
  );
  process.exit(1);
}
if (
  alignBackend &&
  alignBackend !== "colmap_vanilla" &&
  alignBackend !== "colmap_pose_prior"
) {
  console.error(`Invalid --align-backend "${alignBackend}"`);
  process.exit(1);
}
if (quality !== "draft" && quality !== "standard") {
  console.error(`Invalid --quality "${quality}" (expected draft|standard)`);
  process.exit(1);
}
if (speed !== "fast" && speed !== "standard") {
  console.error(`Invalid --speed "${speed}" (expected fast|standard)`);
  process.exit(1);
}

const matchToleranceSec = toleranceSecRaw ? Number(toleranceSecRaw) : undefined;
if (toleranceSecRaw && !Number.isFinite(matchToleranceSec)) {
  console.error(`Invalid --tolerance-sec "${toleranceSecRaw}"`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const modalEndpoint = process.env.MODAL_TWIN_ENDPOINT?.trim();

if (!supabaseUrl || !serviceRole || !modalEndpoint) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or MODAL_TWIN_ENDPOINT");
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
  .select("id, storage_key, asset_kind")
  .eq("capture_id", captureId)
  .eq("org_id", capture.org_id)
  .is("deleted_at", null);
if (assetErr) {
  console.error("Failed to load assets:", assetErr.message);
  process.exit(1);
}

const allReadyAssets = (assets ?? []).filter((row) => row.storage_key);
const selectedAssets = onlyAssetId
  ? allReadyAssets.filter((row) => row.id === onlyAssetId)
  : allReadyAssets;
if (!selectedAssets.length) {
  console.error(onlyAssetId ? `Asset not found in capture: ${onlyAssetId}` : "No ready assets with storage keys for this capture");
  process.exit(1);
}
if (!allReadyAssets.length) {
  console.error("No ready assets with storage keys for this capture");
  process.exit(1);
}

// Mirrors src/trigger/twin-gaussian-splat.ts exactly.
const MEDIA_KINDS = new Set(["photo", "video", "panorama_360", "drone_photo", "drone_video"]);
const mediaAssets = selectedAssets.filter((row) => MEDIA_KINDS.has(row.asset_kind ?? ""));
const posesAsset = selectedAssets.find((row) => row.asset_kind === "lidar_poses");
const plyAsset = selectedAssets.find((row) => row.asset_kind === "ply_lidar");

if (!mediaAssets.length) {
  console.error("No photo or video assets ready for processing");
  process.exit(1);
}

const inputAssetIds = selectedAssets.map((row) => row.id);

const { data: job, error: jobErr } = await admin
  .from("digital_twin_processing_jobs")
  .insert({
    org_id: capture.org_id,
    space_id: capture.space_id,
    capture_id: capture.id,
    created_by: capture.created_by,
    job_type: "gaussian_splat",
    status: "processing",
    input_asset_ids: inputAssetIds,
    output_format: "spz",
    started_at: new Date().toISOString(),
    progress_pct: 5,
    error_text: null,
  })
  .select("id")
  .single();

if (jobErr || !job?.id) {
  console.error("Failed to create job:", jobErr?.message ?? "no row");
  process.exit(1);
}

const logLine = `${new Date().toISOString()} jobId=${job.id} arm=${arm} alignBackend=${alignBackend || "default"} capture=${captureId} quality=${quality} speed=${speed}${
  matchToleranceSec !== undefined ? ` toleranceSec=${matchToleranceSec}` : ""
}${noPly ? " noPly" : ""}${debugArtifacts ? " debug" : ""}${
  rollCorrectionDeg !== undefined ? ` rollDeg=${rollCorrectionDeg}` : ""
}`;
console.log(`[dispatch-experiment] ${logLine}`);
fs.appendFileSync("experiments.log", `${logLine}\n`);

const dispatchPayload = {
  jobId: job.id,
  orgId: capture.org_id,
  spaceId: capture.space_id,
  captureId: capture.id,
  sourceKeys: mediaAssets.map((row) => row.storage_key),
  is360Flags: mediaAssets.map((row) => row.asset_kind === "panorama_360"),
  quality,
  speed,
  modelType: "gaussian_splat",
  newAssetIds: mediaAssets.map((row) => row.id),
  lidarPosesKey: posesAsset?.storage_key ?? null,
  lidarPlyKey: noPly ? null : (plyAsset?.storage_key ?? null),
  forceColmap: arm === "colmap" || alignBackend === "colmap_pose_prior",
  ...(alignBackend ? { alignBackend } : {}),
  ...(trainProfile ? { trainProfile } : {}),
  debugArtifacts,
  ...(matchToleranceSec !== undefined ? { matchToleranceSec } : {}),
  ...(rollCorrectionDeg !== undefined ? { rollCorrectionDeg } : {}),
};

console.log(`[dispatch-experiment] posting to ${modalEndpoint}`);
const response = await fetch(modalEndpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(process.env.GPU_WORKER_SECRET_KEY
      ? { "x-dispatch-token": process.env.GPU_WORKER_SECRET_KEY.trim() }
      : {}),
  },
  body: JSON.stringify(dispatchPayload),
});

const modalRunId = response.headers.get("x-modal-run-id") ?? null;

if (!response.ok) {
  const detail = (await response.text().catch(() => "")).slice(0, 500);
  console.error(`[dispatch-experiment] Modal dispatch FAILED (${response.status}): ${detail || response.statusText}`);
  process.exit(1);
}

if (modalRunId) {
  await admin
    .from("digital_twin_processing_jobs")
    .update({ worker_run_id: modalRunId })
    .eq("id", job.id);
}

console.log(
  JSON.stringify(
    {
      jobId: job.id,
      arm,
      alignBackend: alignBackend || null,
      quality,
      speed,
      noPly,
      debugArtifacts,
      modalRunId,
      spaceId: capture.space_id,
    },
    null,
    2,
  ),
);

if (!shouldPoll) {
  process.exit(0);
}

// AF12: poll to terminal, then apply the permanent publish protocol on success.
const POLL_MS = 20_000;
const MAX_WAIT_MS = 3 * 60 * 60_000;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log(`[publish] polling job ${job.id} to terminal status...`);
const started = Date.now();
let finalRow = null;
while (Date.now() - started < MAX_WAIT_MS) {
  await sleep(POLL_MS);
  const { data: row } = await admin
    .from("digital_twin_processing_jobs")
    .select("id, status, output_model_id, error_text, progress_pct")
    .eq("id", job.id)
    .single();
  if (!row) break;
  console.log(`[publish poll] status=${row.status} progress=${row.progress_pct}`);
  if (row.status === "completed" || row.status === "failed") {
    finalRow = row;
    break;
  }
}

if (!finalRow) {
  console.error("[experiment] TIMED OUT waiting for terminal status");
  process.exit(1);
}

if (finalRow.status === "failed") {
  console.error(`[experiment] job FAILED: ${finalRow.error_text}`);
  process.exit(1);
}

if (!shouldPublish) {
  const { data: resultModel } = await admin
    .from("digital_twin_models")
    .select("id, storage_key, quality_metrics, georef")
    .eq("id", finalRow.output_model_id)
    .maybeSingle();
  const shareToken = randomBytes(24).toString("base64url");
  await admin.from("digital_twin_share_tokens").insert({
    token: shareToken,
    org_id: capture.org_id,
    space_id: capture.space_id,
    created_by: capture.created_by,
    role: "view",
    label: `Phase 1 ${reportLabel}`,
  });
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.slate360.ai"}/share/twin/${shareToken}`;
  const shareResponse = await fetch(shareUrl, { redirect: "manual" });
  await admin
    .from("digital_twin_share_tokens")
    .update({ is_revoked: true })
    .eq("token", shareToken);
  const record = {
    jobId: job.id,
    captureId,
    spaceId: capture.space_id,
    arm,
    alignBackend: alignBackend || "default",
    status: finalRow.status,
    modelId: resultModel?.id ?? null,
    storageKey: resultModel?.storage_key ?? null,
    qualityMetrics: resultModel?.quality_metrics ?? null,
    georef: resultModel?.georef ?? null,
    shareTokenCreated: true,
    shareHttpStatus: shareResponse.status,
    shareTargetNote: "Share route resolves the space's published model; fresh A/B model was not published.",
    visualGate: "NOT_PERFORMED — Brian must inspect the share output",
  };
  const reportPath = "docs/ops/PHASE1_ACCEPTANCE_REPORT.md";
  fs.mkdirSync("docs/ops", { recursive: true });
  if (!fs.existsSync(reportPath)) {
    fs.writeFileSync(
      reportPath,
      "# Phase 1 Twin 360 acceptance report\n\nMetrics do not constitute the R7.5 visual gate; Brian must inspect each viewable output.\n",
      "utf8",
    );
  }
  fs.appendFileSync(
    reportPath,
    `\n## ${reportLabel} ${new Date().toISOString()}\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`,
    "utf8",
  );
  console.log(JSON.stringify(record, null, 2));
  process.exit(0);
}

const newModelId = finalRow.output_model_id;
const { data: currentSpace, error: spaceErr } = await admin
  .from("digital_twin_spaces")
  .select("id, org_id, published_model_id")
  .eq("id", capture.space_id)
  .single();
if (spaceErr || !currentSpace) {
  console.error("[publish] Failed to load space:", spaceErr?.message);
  process.exit(1);
}

const oldModelId = currentSpace.published_model_id;
if (oldModelId && oldModelId !== newModelId) {
  const { error: clearErr } = await admin
    .from("digital_twin_models")
    .update({ is_primary: false })
    .eq("id", oldModelId);
  if (clearErr) {
    console.error("[publish] Failed to clear old is_primary:", clearErr.message);
    process.exit(1);
  }
  console.log(`[publish] cleared is_primary on ${oldModelId}`);
}

const { error: setErr } = await admin
  .from("digital_twin_models")
  .update({ is_primary: true })
  .eq("id", newModelId);
if (setErr) {
  console.error("[publish] Failed to set new is_primary:", setErr.message);
  process.exit(1);
}

const { error: publishErr } = await admin
  .from("digital_twin_spaces")
  .update({ published_model_id: newModelId })
  .eq("id", capture.space_id);
if (publishErr) {
  console.error("[publish] Failed to set published_model_id:", publishErr.message);
  process.exit(1);
}

// Verify via the same resolution logic the viewers use (published_model_id wins, else is_primary).
let resolveQuery = admin
  .from("digital_twin_models")
  .select("id, storage_key, status, is_primary, quality_metrics")
  .eq("space_id", capture.space_id)
  .eq("org_id", currentSpace.org_id)
  .eq("status", "ready")
  .is("deleted_at", null);
resolveQuery = resolveQuery.eq("id", newModelId);
const { data: resolved } = await resolveQuery.maybeSingle();

console.log(
  JSON.stringify(
    {
      published: true,
      modelId: resolved?.id,
      isPrimary: resolved?.is_primary,
      psnr: resolved?.quality_metrics?.trainPsnr,
      alignmentPath: resolved?.quality_metrics?.alignmentPath,
    },
    null,
    2,
  ),
);
console.log("[publish] refresh your share link");
console.log(
  "[publish] R7.5 GATE: this run is NOT complete until you open the share link " +
    "in a browser and confirm what it actually renders — metrics alone already " +
    "missed a giant-blob bug once.",
);
