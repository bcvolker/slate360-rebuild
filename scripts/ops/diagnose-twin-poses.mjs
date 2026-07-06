#!/usr/bin/env node
/**
 * Twin 360 capture forensics — classify a capture as native (ARKit/LiDAR) vs
 * web-fallback, sanity-check its ARKit pose data, and simulate the worker's
 * video-frame -> keyframe timestamp matching to quantify tolerance sensitivity.
 *
 * Reads ONLY the capture's lidar_poses.json.gz (if present) + its asset manifest
 * from R2/Supabase — never downloads or decodes the actual video, since a clip's
 * simulated frame timestamps are fully determined by poses.json's clips[]
 * start_time/duration (the same metadata the worker itself uses), matching
 * workers/modal/twin-gaussian-splat/worker.py's `_match_and_write_transforms`.
 *
 * Usage:
 *   node scripts/ops/diagnose-twin-poses.mjs --capture-id <uuid>
 *   node scripts/ops/diagnose-twin-poses.mjs --space-id <uuid>   # uses the space's latest capture
 */

import fs from "node:fs";
import zlib from "node:zlib";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// Mirrors worker.py's DEFAULT_MATCH_TOLERANCE_SEC / LEGACY_MATCH_TOLERANCE_SEC —
// kept in sync by hand since this script never imports the worker.
const DEFAULT_MATCH_TOLERANCE_SEC = 0.25;
const LEGACY_MATCH_TOLERANCE_SEC = 2.0;
const MIN_LIDAR_BYPASS_FRAMES = 5;

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1]?.trim() : "";
}

function percentileOf(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(p * (sortedAsc.length - 1))));
  return sortedAsc[idx];
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const captureIdArg = arg("capture-id");
const spaceIdArg = arg("space-id");
if (!captureIdArg && !spaceIdArg) {
  console.error("Usage: node scripts/ops/diagnose-twin-poses.mjs --capture-id <uuid> | --space-id <uuid>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const bucket = process.env.R2_BUCKET || "slate360-storage";
const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");
if (!endpoint) {
  console.error("Missing R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}
const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function resolveCapture() {
  if (captureIdArg) {
    const { data, error } = await admin
      .from("digital_twin_captures")
      .select("id, org_id, space_id, project_id, title, capture_status, has_lidar, created_at, uploaded_at")
      .eq("id", captureIdArg)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Capture not found: ${captureIdArg}`);
    return data;
  }
  const { data, error } = await admin
    .from("digital_twin_captures")
    .select("id, org_id, space_id, project_id, title, capture_status, has_lidar, created_at, uploaded_at")
    .eq("space_id", spaceIdArg)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No captures found for space: ${spaceIdArg}`);
  return data;
}

async function downloadAndMaybeGunzip(key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from(await obj.Body.transformToByteArray());
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return zlib.gunzipSync(bytes);
  }
  return bytes;
}

// column-major flat 4x4 (Swift simd_float4x4 flattening): translation = 4th column.
function translationOf(t) {
  return [t[12], t[13], t[14]];
}
// column-major flat 4x4: rotation submatrix from columns 0,1,2.
function rotationOf(t) {
  return [
    [t[0], t[4], t[8]],
    [t[1], t[5], t[9]],
    [t[2], t[6], t[10]],
  ];
}
function dist3(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}
function transposeMulSelf(R) {
  // R^T * R (3x3)
  const RT = [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]],
  ];
  const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += RT[i][k] * R[k][j];
      out[i][j] = sum;
    }
  }
  return out;
}
function det3(R) {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  );
}

function printVerdict({ native, posesVerdict, posesReasons, matchingVerdict }) {
  console.log("\n" + "=".repeat(72));
  console.log("VERDICT");
  console.log("=".repeat(72));
  console.log(`  Capture type:     ${native ? "NATIVE" : "WEB"}`);
  console.log(
    `  Poses:            ${posesVerdict}` +
      (posesReasons?.length ? ` (${posesReasons.length} reason(s) above)` : ""),
  );
  console.log(`  Frame matching:   ${matchingVerdict}`);
  console.log("=".repeat(72));
}

function printOperatorSteps(captureId) {
  console.log(`
R3 — discriminating experiment (operator steps)
-------------------------------------------------------------------------
This capture's job cannot be re-queued through the flag: force_colmap is
plumbed through src/trigger/twin-gaussian-splat.ts only (not the public
POST /api/digital-twin/jobs body, per this package's file-footprint), so
drive it with a direct Trigger invocation — the same pattern already used
by scripts/ops/reprocess-twin-capture.mjs:

  1. Re-queue this SAME capture TWICE, inserting a fresh
     digital_twin_processing_jobs row each time (input_asset_ids = this
     capture's ready asset ids, status "queued"), then dispatching:

       a. DEFAULT run   — bypass with tightened ±250ms matching:
            tasks.trigger("twin.gaussian_splat", { jobId })

       b. force_colmap  — skip the bypass, run standard COLMAP even
          though lidar_poses/ply_lidar exist:
            tasks.trigger("twin.gaussian_splat", { jobId, forceColmap: true })

  2. Compare the two resulting models visually + by
     quality_metrics.trainPsnr / quality_metrics.alignmentPath on each
     digital_twin_processing_jobs row (both fields populated by this
     package's worker.py instrumentation).

  3. Interpret:
       - COLMAP coherent, bypass garbage   -> pose math/matching is guilty.
         Fix path: convention audit of transform_4x4 handling worker-side
         (column-major, camera-to-world, axis conversion to Nerfstudio's
         convention), keep tightened matching.
       - BOTH garbage                       -> capture-data or extraction
         problem; escalate with this script's output attached.
       - BOTH coherent after tightening alone -> matching tolerance was the
         whole bug; no further worker-side pose-math changes needed.

  Advanced: to A/B the tightened default against the ORIGINAL ±2s tolerance
  (LEGACY_MATCH_TOLERANCE_SEC = ${LEGACY_MATCH_TOLERANCE_SEC}), call the Modal endpoint directly with
  matchToleranceSec: ${LEGACY_MATCH_TOLERANCE_SEC} in the payload — that override is worker-payload-only
  (not plumbed through Trigger/API).

  NOTE: worker.py changes require a Modal redeploy before EITHER run above
  reflects the new behavior:
    cd workers/modal/twin-gaussian-splat
    PYTHONIOENCODING=utf-8 python -m modal deploy worker.py

  capture_id for reference: ${captureId}
`);
}

async function main() {
  const capture = await resolveCapture();
  console.log(
    `[diagnose] capture=${capture.id} space=${capture.space_id} org=${capture.org_id} ` +
      `status=${capture.capture_status} has_lidar=${capture.has_lidar}`,
  );

  const { data: assets, error: assetsError } = await admin
    .from("digital_twin_capture_assets")
    .select("id, asset_kind, storage_key, file_size_bytes, content_type, status, duration_secs, width, height, created_at")
    .eq("capture_id", capture.id)
    .eq("org_id", capture.org_id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (assetsError) throw new Error(assetsError.message);
  if (!assets?.length) throw new Error(`No assets found for capture ${capture.id}`);

  console.log(`\n[diagnose] ASSET MANIFEST (${assets.length} asset(s)):`);
  for (const a of assets) {
    console.log(
      `  - ${a.asset_kind} · ${a.storage_key} · ${a.file_size_bytes ?? "?"} bytes · status=${a.status}` +
        (a.duration_secs ? ` · ${a.duration_secs}s` : "") +
        (a.width && a.height ? ` · ${a.width}x${a.height}` : ""),
    );
  }

  const posesAsset = assets.find((a) => a.asset_kind === "lidar_poses");
  const plyAsset = assets.find((a) => a.asset_kind === "ply_lidar");
  const videoAssets = assets.filter((a) => a.asset_kind === "video");
  const photoAssets = assets.filter((a) => a.asset_kind === "photo");

  const isNative = Boolean(posesAsset);
  console.log(`\n[diagnose] CLASSIFICATION: ${isNative ? "NATIVE (ARKit/LiDAR)" : "WEB-FALLBACK"}`);
  console.log(`  lidar_poses asset: ${posesAsset ? "present" : "ABSENT"}`);
  console.log(`  ply_lidar asset:   ${plyAsset ? "present" : "ABSENT"}`);
  console.log(`  video assets:      ${videoAssets.length}`);
  console.log(`  photo assets:      ${photoAssets.length}`);

  if (!isNative) {
    console.log(
      "\n[diagnose] No lidar_poses asset — this is a web-fallback capture (no ARKit pose " +
        "data). Skipping pose sanity + matching simulation.",
    );
    printVerdict({
      native: false,
      posesVerdict: "N/A",
      posesReasons: ["capture has no lidar_poses asset"],
      matchingVerdict: "N/A",
    });
    printOperatorSteps(capture.id);
    return;
  }

  const posesBytes = await downloadAndMaybeGunzip(posesAsset.storage_key);
  const posesData = JSON.parse(posesBytes.toString("utf8"));

  const frames = Array.isArray(posesData.frames) ? posesData.frames : [];
  const clips = Array.isArray(posesData.clips) ? posesData.clips : [];
  console.log(
    `\n[diagnose] poses.json version=${posesData.version ?? "?"} keyframes=${frames.length} ` +
      `clips=${clips.length} session_start_time=${posesData.session_start_time ?? "?"}`,
  );

  // ---- b. pose sanity ----
  const reasons = [];

  if (frames.length < MIN_LIDAR_BYPASS_FRAMES) {
    reasons.push(`only ${frames.length} keyframes (<${MIN_LIDAR_BYPASS_FRAMES} minimum for bypass)`);
  }

  let monotonic = true;
  let nonMonotonicCount = 0;
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1]?.timestamp;
    const curr = frames[i]?.timestamp;
    if (typeof prev !== "number" || typeof curr !== "number") continue;
    if (curr < prev) {
      monotonic = false;
      nonMonotonicCount++;
    }
  }
  if (!monotonic) reasons.push(`${nonMonotonicCount} non-monotonic timestamp step(s)`);

  const translationSteps = [];
  for (let i = 1; i < frames.length; i++) {
    const t0 = frames[i - 1]?.transform_4x4;
    const t1 = frames[i]?.transform_4x4;
    if (!Array.isArray(t0) || t0.length !== 16 || !Array.isArray(t1) || t1.length !== 16) continue;
    translationSteps.push(dist3(translationOf(t0), translationOf(t1)));
  }
  const sortedSteps = [...translationSteps].sort((a, b) => a - b);
  const medianStep = percentileOf(sortedSteps, 0.5);
  const p95Step = percentileOf(sortedSteps, 0.95);
  if (medianStep !== null) {
    if (medianStep > 1.0) {
      reasons.push(
        `median translation step ${medianStep.toFixed(2)}m per keyframe is implausible for ` +
          `walking (>1.0m; suggests drift/teleportation)`,
      );
    }
    if (medianStep < 0.02) {
      reasons.push(
        `median translation step ${(medianStep * 100).toFixed(1)}cm per keyframe is implausibly ` +
          `small (<2cm; device may be stationary or poses duplicated)`,
      );
    }
  }

  let maxOrthoDeviation = 0;
  let badRotationCount = 0;
  let detOutliers = 0;
  for (const kf of frames) {
    const t = kf?.transform_4x4;
    if (!Array.isArray(t) || t.length !== 16) continue;
    const R = rotationOf(t);
    const RtR = transposeMulSelf(R);
    let dev = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        dev = Math.max(dev, Math.abs(RtR[i][j] - (i === j ? 1 : 0)));
      }
    }
    maxOrthoDeviation = Math.max(maxOrthoDeviation, dev);
    if (dev > 0.01) badRotationCount++;
    if (Math.abs(det3(R) - 1) > 0.05) detOutliers++;
  }
  if (badRotationCount > 0) {
    reasons.push(
      `${badRotationCount}/${frames.length} keyframe(s) have non-orthonormal rotation ` +
        `(max deviation ${maxOrthoDeviation.toFixed(4)}, tolerance 0.01)`,
    );
  }
  if (detOutliers > 0) {
    reasons.push(`${detOutliers}/${frames.length} keyframe(s) have det(R) far from +1 (possible reflection/corrupt transform)`);
  }

  let gravityOutliers = 0;
  for (const kf of frames) {
    const g = kf?.gravity;
    if (!Array.isArray(g) || g.length !== 3) continue;
    const mag = Math.sqrt(g[0] ** 2 + g[1] ** 2 + g[2] ** 2);
    const dotUp = g[1] / (mag || 1);
    if (Math.abs(mag - 1) > 0.05 || dotUp < 0.95) gravityOutliers++;
  }
  if (gravityOutliers > 0) {
    reasons.push(`${gravityOutliers}/${frames.length} keyframe(s) have an implausible gravity vector (expected ~[0,1,0])`);
  }

  let intrinsicsOutliers = 0;
  for (const kf of frames) {
    const intr = kf?.intrinsics || {};
    const w = kf?.w;
    const h = kf?.h;
    if (!intr.fx || !intr.fy || !w || !h) {
      intrinsicsOutliers++;
      continue;
    }
    const cx = intr.cx ?? w / 2;
    const cy = intr.cy ?? h / 2;
    const cxOk = cx > 0.3 * w && cx < 0.7 * w;
    const cyOk = cy > 0.3 * h && cy < 0.7 * h;
    const ratio = intr.fx / intr.fy;
    const ratioOk = ratio > 0.5 && ratio < 2.0;
    if (!cxOk || !cyOk || !ratioOk) intrinsicsOutliers++;
  }
  if (intrinsicsOutliers > 0) {
    reasons.push(`${intrinsicsOutliers}/${frames.length} keyframe(s) have intrinsics inconsistent with recorded w/h`);
  }

  const posesPlausible = reasons.length === 0;

  console.log("\n[diagnose] POSE SANITY");
  console.log(`  keyframes: ${frames.length}`);
  console.log(`  monotonic timestamps: ${monotonic ? "yes" : `NO (${nonMonotonicCount} regression(s))`}`);
  console.log(
    `  translation step (m): median=${medianStep?.toFixed(3) ?? "n/a"} p95=${p95Step?.toFixed(3) ?? "n/a"} ` +
      `min=${sortedSteps[0]?.toFixed(3) ?? "n/a"} max=${sortedSteps[sortedSteps.length - 1]?.toFixed(3) ?? "n/a"}`,
  );
  console.log(
    `  rotation orthonormality: max deviation=${maxOrthoDeviation.toFixed(4)} (tolerance 0.01), ` +
      `${badRotationCount} keyframe(s) over tolerance, ${detOutliers} det(R) outlier(s)`,
  );
  console.log(`  gravity outliers: ${gravityOutliers}/${frames.length}`);
  console.log(`  intrinsics outliers: ${intrinsicsOutliers}/${frames.length}`);
  if (reasons.length) {
    console.log("  SUSPECT reasons:");
    for (const r of reasons) console.log(`    - ${r}`);
  } else {
    console.log("  no anomalies detected");
  }

  // ---- c. frame-matching simulation ----
  // Replicates worker.py's `_match_and_write_transforms`: for each clip, synthesize
  // frame timestamps at fps=2 (matching ffmpeg's `-vf fps=2`) purely from the clip's
  // recorded start_time + duration (no video download needed), then find each
  // simulated frame's nearest keyframe by wall-clock time and record the delta.
  const allDeltas = [];
  const perClip = [];
  for (const clip of clips) {
    const video = clip?.video ?? "unknown";
    const startTime = typeof clip?.start_time === "number" ? clip.start_time : null;
    const duration = typeof clip?.duration === "number" ? clip.duration : null;
    if (startTime === null || duration === null) {
      perClip.push({
        video,
        skipped: true,
        reason: "missing start_time/duration in poses.json — worker would ffprobe the video; cannot simulate offline",
      });
      continue;
    }
    const frameCount = Math.max(0, Math.floor(duration * 2));
    const deltas = [];
    for (let fidx = 1; fidx <= frameCount; fidx++) {
      const frameTime = startTime + (fidx - 1) / 2.0;
      let nearest = Infinity;
      for (const kf of frames) {
        if (typeof kf?.timestamp !== "number") continue;
        const d = Math.abs(kf.timestamp - frameTime);
        if (d < nearest) nearest = d;
      }
      if (Number.isFinite(nearest)) {
        deltas.push(nearest);
        allDeltas.push(nearest);
      }
    }
    perClip.push({ video, startTime, duration, simulatedFrames: frameCount, deltas });
  }

  const sortedDeltas = [...allDeltas].sort((a, b) => a - b);
  const medianDeltaMs = percentileOf(sortedDeltas, 0.5) * 1000 || null;
  const p95DeltaMs = percentileOf(sortedDeltas, 0.95) * 1000 || null;
  const within250 = allDeltas.filter((d) => d <= DEFAULT_MATCH_TOLERANCE_SEC).length;
  const within2000 = allDeltas.filter((d) => d <= LEGACY_MATCH_TOLERANCE_SEC).length;

  console.log("\n[diagnose] FRAME-MATCHING SIMULATION (fps=2, nearest-keyframe)");
  for (const c of perClip) {
    if (c.skipped) {
      console.log(`  clip ${c.video}: SKIPPED (${c.reason})`);
      continue;
    }
    const cd = [...c.deltas].sort((a, b) => a - b);
    const cMedian = percentileOf(cd, 0.5);
    console.log(
      `  clip ${c.video}: start=${c.startTime.toFixed(3)} duration=${c.duration.toFixed(1)}s ` +
        `frames=${c.simulatedFrames} median_delta=${cMedian !== null ? (cMedian * 1000).toFixed(0) : "n/a"}ms`,
    );
  }
  console.log(`  TOTAL simulated frames: ${allDeltas.length}`);
  console.log(
    `  match-delta distribution: median=${medianDeltaMs !== null ? medianDeltaMs.toFixed(0) : "n/a"}ms ` +
      `p95=${p95DeltaMs !== null ? p95DeltaMs.toFixed(0) : "n/a"}ms`,
  );
  console.log(
    `  frames matching within ±250ms (tightened default): ${within250}/${allDeltas.length}` +
      (allDeltas.length ? ` (${((100 * within250) / allDeltas.length).toFixed(1)}%)` : ""),
  );
  console.log(
    `  frames matching within ±2000ms (legacy tolerance):  ${within2000}/${allDeltas.length}` +
      (allDeltas.length ? ` (${((100 * within2000) / allDeltas.length).toFixed(1)}%)` : ""),
  );

  const matchingTight = allDeltas.length > 0 && within250 / allDeltas.length >= 0.9;
  const matchingVerdict = allDeltas.length === 0 ? "UNKNOWN (no simulated frames)" : matchingTight ? "TIGHT" : "LOOSE";

  // ---- d. clip metadata ----
  console.log("\n[diagnose] CLIP METADATA");
  console.log(`  clip count: ${clips.length}`);
  const kfTimestamps = frames.map((f) => f?.timestamp).filter((t) => typeof t === "number");
  const kfStart = kfTimestamps.length ? Math.min(...kfTimestamps) : null;
  const kfEnd = kfTimestamps.length ? Math.max(...kfTimestamps) : null;
  console.log(`  keyframe timestamp range: ${kfStart ?? "n/a"} .. ${kfEnd ?? "n/a"}`);
  console.log(`  session_start_time: ${posesData.session_start_time ?? "n/a"}`);
  for (const clip of clips) {
    const withinRange =
      kfStart !== null && typeof clip?.start_time === "number"
        ? clip.start_time >= kfStart - 1 && clip.start_time <= (kfEnd ?? clip.start_time) + 1
        : null;
    console.log(
      `  - ${clip?.video ?? "unknown"}: start=${clip?.start_time ?? "n/a"} duration=${clip?.duration ?? "n/a"} ` +
        `withinKeyframeRange=${withinRange === null ? "n/a" : withinRange}`,
    );
  }

  printVerdict({
    native: true,
    posesVerdict: posesPlausible ? "PLAUSIBLE" : "SUSPECT",
    posesReasons: reasons,
    matchingVerdict,
  });
  printOperatorSteps(capture.id);
}

main().catch((err) => {
  console.error("[diagnose] failed:", err?.message ?? err);
  process.exit(1);
});
