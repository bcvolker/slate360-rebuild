#!/usr/bin/env node
/**
 * Ingest a real DJI Mavic 3 Enterprise mission for Phase 1 acceptance.
 *
 * This intentionally creates a new project/space/capture and keeps the source
 * rows so the resulting job can be reprocessed without uploading the photos
 * again. It does not deploy workers or publish a model.
 *
 * Usage:
 *   node scripts/ops/ingest-drone-photoset.mjs \
 *     --photos C:\ASU-Survey\DJI_202607150603_0015 \
 *     --mrk C:\ASU-Survey\DJI_202607150603_0015\DJI_202607150603_015_Timestamp.MRK \
 *     --runs 2
 */

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const POLL_MS = 30_000;
const MAX_WAIT_MS = 6 * 60 * 60_000;
const REPORT_PATH = path.resolve("docs/ops/PHASE1_ACCEPTANCE_REPORT.md");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;
    process.env[key] = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() || fallback : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".mrk":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function parseMrk(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = lines
    .map((line) => {
      const lat = Number(line.match(/([-+]?\d+(?:\.\d+)?),Lat/)?.[1]);
      const lon = Number(line.match(/([-+]?\d+(?:\.\d+)?),Lon/)?.[1]);
      const ellh = Number(line.match(/([-+]?\d+(?:\.\d+)?),Ellh/)?.[1]);
      return { lat, lon, ellh };
    })
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon));
  const range = (values) => ({
    min: Math.min(...values),
    max: Math.max(...values),
  });
  return {
    fileName: path.basename(filePath),
    rowCount: lines.length,
    parsedPositionCount: rows.length,
    latitude: range(rows.map((row) => row.lat)),
    longitude: range(rows.map((row) => row.lon)),
    ellipsoidHeightM: rows.some((row) => Number.isFinite(row.ellh))
      ? range(rows.map((row) => row.ellh).filter(Number.isFinite))
      : null,
    format: "DJI_MRK_TIMESTAMP_V1",
  };
}

function listPhotos(directory) {
  return fs
    .readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((filePath) => /\.(jpe?g)$/i.test(filePath))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function uploadFiles(s3, bucket, prefix, files) {
  const rows = [];
  const concurrency = 8;
  for (let start = 0; start < files.length; start += concurrency) {
    const batch = files.slice(start, start + concurrency);
    const uploaded = await Promise.all(
      batch.map(async (filePath) => {
        const key = `${prefix}/${path.basename(filePath)}`;
        const body = fs.readFileSync(filePath);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType(filePath),
          }),
        );
        return {
          fileName: path.basename(filePath),
          storageKey: key,
          assetKind: "drone_photo",
          contentType: contentType(filePath),
          fileSizeBytes: body.length,
        };
      }),
    );
    rows.push(...uploaded);
    console.log(`[phase1-drone] uploaded ${rows.length}/${files.length} photos`);
  }
  return rows;
}

async function verifyObjects(s3, bucket, keys) {
  const results = await Promise.all(
    keys.map(async (key) => {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { key, present: true };
      } catch (error) {
        return {
          key,
          present: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
  return {
    expected: results.length,
    present: results.filter((row) => row.present).length,
    missing: results.filter((row) => !row.present),
  };
}

async function waitForJob(admin, jobId) {
  const started = Date.now();
  let lastStatus = "queued";
  while (Date.now() - started < MAX_WAIT_MS) {
    await sleep(POLL_MS);
    const { data: row, error } = await admin
      .from("digital_twin_processing_jobs")
      .select(
        "id, status, progress_pct, worker_run_id, error_text, output_storage_key, output_model_id, completed_at",
      )
      .eq("id", jobId)
      .single();
    if (error) throw new Error(`Polling ${jobId} failed: ${error.message}`);
    if (!row) throw new Error(`Polling ${jobId} returned no row`);
    lastStatus = row.status;
    console.log(
      `[phase1-drone] job=${jobId} status=${row.status} progress=${row.progress_pct ?? 0}%`,
    );
    if (row.status === "completed" || row.status === "failed") return row;
  }
  return { id: jobId, status: "timeout", lastStatus };
}

async function appendReport(entry) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const heading = `\n## Exterior acceptance run ${new Date().toISOString()}\n\n`;
  const body = `${heading}\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\`\n`;
  if (!fs.existsSync(REPORT_PATH)) {
    fs.writeFileSync(
      REPORT_PATH,
      "# Phase 1 Twin 360 acceptance report\n\nReal-data results only. Metrics do not constitute the R7.5 visual gate; Brian must inspect each viewable output.\n",
      "utf8",
    );
  }
  fs.appendFileSync(REPORT_PATH, body, "utf8");
}

async function main() {
  loadEnv(path.resolve(".env"));
  loadEnv(path.resolve(".env.local"));

  const photosDirectory = path.resolve(arg("photos"));
  const mrkPath = arg("mrk") ? path.resolve(arg("mrk")) : "";
  const runs = Math.max(1, Math.min(2, Number(arg("runs", "1")) || 1));
  const quality = arg("quality", "standard") === "high" ? "high" : "standard";
  const label = arg("label", path.basename(photosDirectory));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.slate360.ai";

  if (!fs.existsSync(photosDirectory)) throw new Error(`Photo directory not found: ${photosDirectory}`);
  const photos = listPhotos(photosDirectory);
  if (photos.length < 3) throw new Error(`Expected at least three JPG files, found ${photos.length}`);
  if (mrkPath && !fs.existsSync(mrkPath)) throw new Error(`MRK file not found: ${mrkPath}`);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.R2_BUCKET || "slate360-storage";
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.CLOUDFLARE_ACCOUNT_ID
      ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "");
  if (!supabaseUrl || !serviceRole || !endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing Supabase or R2 configuration");
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const s3 = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const email = process.env.E2E_TWIN_CEO_EMAIL || process.env.CEO_EMAIL || "slate360ceo@gmail.com";
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  if (profileError || !profile?.id) throw new Error(`CEO profile lookup failed: ${profileError?.message ?? "missing"}`);

  const { data: member, error: memberError } = await admin
    .from("organization_members")
    .select("org_id, user_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();
  if (memberError || !member?.org_id) throw new Error(`Organization lookup failed: ${memberError?.message ?? "missing"}`);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({ name: `Phase1 ${label}`, org_id: member.org_id, created_by: member.user_id })
    .select("id")
    .single();
  if (projectError || !project?.id) throw new Error(`Project creation failed: ${projectError?.message ?? "missing"}`);

  const { data: space, error: spaceError } = await admin
    .from("digital_twin_spaces")
    .insert({
      org_id: member.org_id,
      project_id: project.id,
      created_by: member.user_id,
      title: `Phase 1 ${label}`,
      status: "draft",
    })
    .select("id")
    .single();
  if (spaceError || !space?.id) throw new Error(`Twin space creation failed: ${spaceError?.message ?? "missing"}`);

  const { data: capture, error: captureError } = await admin
    .from("digital_twin_captures")
    .insert({
      org_id: member.org_id,
      space_id: space.id,
      project_id: project.id,
      created_by: member.user_id,
      title: `Phase 1 ${label}`,
      capture_status: "uploading",
      capture_metadata: {
        acceptance: {
          sourceRole: "drone",
          camera: "DJI Mavic 3 Enterprise",
          missionDirectory: photosDirectory,
          mrk: parseMrk(mrkPath),
        },
      },
    })
    .select("id")
    .single();
  if (captureError || !capture?.id) throw new Error(`Capture creation failed: ${captureError?.message ?? "missing"}`);

  const prefix = `orgs/${member.org_id}/digital-twin/${space.id}/${capture.id}`;
  const photoRows = await uploadFiles(s3, bucket, prefix, photos);
  const mrkRows = mrkPath
    ? [
        {
          fileName: path.basename(mrkPath),
          storageKey: `${prefix}/${path.basename(mrkPath)}`,
          // The current production CHECK constraint has no MRK-specific kind.
          // Keep the evidence row as `other`; the product Trigger identifies
          // it by its .MRK suffix and never passes it to COLMAP as a photo.
          assetKind: "other",
          contentType: "text/plain",
          fileSizeBytes: fs.statSync(mrkPath).size,
        },
      ]
    : [];
  if (mrkRows.length) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: mrkRows[0].storageKey,
        Body: fs.readFileSync(mrkPath),
        ContentType: "text/plain",
      }),
    );
  }

  const assetRows = [...photoRows, ...mrkRows].map((row) => ({
    org_id: member.org_id,
    space_id: space.id,
    capture_id: capture.id,
    asset_kind: row.assetKind,
    upload_tier: "standard",
    content_type: row.contentType,
    file_size_bytes: row.fileSizeBytes,
    storage_key: row.storageKey,
    status: "ready",
  }));
  const { data: assets, error: assetError } = await admin
    .from("digital_twin_capture_assets")
    .insert(assetRows)
    .select("id, storage_key, asset_kind");
  if (assetError || !assets?.length) throw new Error(`Asset registration failed: ${assetError?.message ?? "missing"}`);
  await admin
    .from("digital_twin_captures")
    .update({ capture_status: "ready" })
    .eq("id", capture.id);

  const sourceVerification = await verifyObjects(
    s3,
    bucket,
    assetRows.map((row) => row.storage_key),
  );
  const { tasks } = await import("@trigger.dev/sdk/v3");
  const results = [];
  for (let run = 1; run <= runs; run++) {
    const { data: job, error: jobError } = await admin
      .from("digital_twin_processing_jobs")
      .insert({
        org_id: member.org_id,
        space_id: space.id,
        capture_id: capture.id,
        created_by: member.user_id,
        job_type: "photogrammetry_mesh",
        status: "queued",
        input_asset_ids: assets.map((row) => row.id),
        output_format: "glb",
      })
      .select("id")
      .single();
    if (jobError || !job?.id) throw new Error(`Job creation failed: ${jobError?.message ?? "missing"}`);
    const triggerRun = await tasks.trigger(
      "twin.photogrammetry_mesh",
      { jobId: job.id, quality },
      undefined,
      { clientConfig: { previewBranch: "" } },
    );
    console.log(`[phase1-drone] run=${run}/${runs} job=${job.id} trigger=${triggerRun?.id ?? "unknown"}`);
    const row = await waitForJob(admin, job.id);
    let model = null;
    let derivativeVerification = null;
    if (row.status === "completed" && row.output_model_id) {
      const { data: modelRow } = await admin
        .from("digital_twin_models")
        .select("id, storage_key, model_format, file_size_bytes, quality_metrics, status")
        .eq("id", row.output_model_id)
        .maybeSingle();
      model = modelRow;
      const derivativeKeys = modelRow?.quality_metrics?.derivativeKeys ?? {};
      const outputKeys = [modelRow?.storage_key, ...Object.values(derivativeKeys)].filter(Boolean);
      derivativeVerification = await verifyObjects(s3, bucket, outputKeys);
    }
    const shareToken = randomBytes(24).toString("base64url");
    await admin.from("digital_twin_share_tokens").insert({
      token: shareToken,
      org_id: member.org_id,
      space_id: space.id,
      created_by: member.user_id,
      role: "view",
      label: `Phase 1 ${label} run ${run}`,
    });
    const shareUrl = `${baseUrl}/share/twin/${shareToken}`;
    const shareResponse = await fetch(shareUrl, { redirect: "manual" });
    results.push({
      run,
      jobId: job.id,
      triggerRunId: triggerRun?.id ?? null,
      status: row.status,
      workerRunId: row.worker_run_id ?? null,
      error: row.error_text ?? null,
      model,
      derivativeVerification,
      shareUrl,
      shareHttpStatus: shareResponse.status,
      visualGate: "NOT_PERFORMED — Brian must inspect the share output",
    });
  }

  const report = {
    source: {
      camera: "DJI Mavic 3 Enterprise",
      photosDirectory,
      photoCount: photos.length,
      mrk: parseMrk(mrkPath),
      sourceVerification,
    },
    orgId: member.org_id,
    projectId: project.id,
    spaceId: space.id,
    captureId: capture.id,
    quality,
    results,
  };
  await appendReport(report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[phase1-drone] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
