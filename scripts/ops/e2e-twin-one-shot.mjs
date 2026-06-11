#!/usr/bin/env node
/**
 * One-shot Digital Twin E2E: upload real photos → enqueue → poll → verify model + share.
 * Usage: node scripts/ops/e2e-twin-one-shot.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const PHOTO_DIR = path.resolve("public/uploads/chat docs");
const PHOTO_NAMES = ["IMG_9386.PNG", "IMG_9387.PNG", "IMG_9388.PNG", "IMG_9389.PNG", "IMG_9390.PNG", "IMG_9391.PNG"];
const VIDEO_FILE = process.env.E2E_TWIN_VIDEO?.trim() ?? "";
const CEO_EMAIL = process.env.E2E_TWIN_CEO_EMAIL?.trim() || process.env.CEO_EMAIL?.trim() || "slate360ceo@gmail.com";
const KEEP_DATA = process.env.E2E_TWIN_KEEP === "1";
const POLL_MS = 30_000;
const MAX_WAIT_MS = VIDEO_FILE ? 3 * 60 * 60_000 : 75 * 60_000;

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

function getEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function buildTwinKey(orgId, spaceId, captureId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  return `orgs/${orgId}/digital-twin/${spaceId}/${captureId}/${Date.now()}_${safe}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadDotEnvFile(path.resolve(".env"));
  loadDotEnvFile(path.resolve(".env.local"));

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = getEnv("R2_BUCKET") || "slate360-storage";
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const endpoint =
    getEnv("R2_ENDPOINT") ||
    (getEnv("CLOUDFLARE_ACCOUNT_ID")
      ? `https://${getEnv("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
      : "");
  const triggerKey = getEnv("TRIGGER_SECRET_KEY");
  const baseUrl = getEnv("NEXT_PUBLIC_BASE_URL") || "https://www.slate360.ai";

  const stages = {
    sourceUploaded: "pending",
    jobQueued: "pending",
    triggerFired: "pending",
    modalDispatched: "pending",
    callbackVerified: "pending",
    modelRow: "pending",
    twinPage: "pending",
    shareLink: "pending",
  };

  if (!supabaseUrl || !serviceRole || !accessKeyId || !secretAccessKey || !endpoint) {
    console.error("[e2e-twin] Missing Supabase/R2 credentials");
    process.exit(1);
  }
  if (!triggerKey) {
    console.error("[e2e-twin] TRIGGER_SECRET_KEY not set");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const s3 = new S3Client({
    region: getEnv("R2_REGION") || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = VIDEO_FILE ? `Brian walkthrough ${new Date().toISOString().slice(0, 10)}` : `__e2e_twin_${Date.now()}__`;
  const cleanup = [];
  let jobId = null;
  let captureId = null;
  let orgId = null;
  let spaceId = null;
  let modelId = null;
  let shareToken = null;

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", CEO_EMAIL)
      .maybeSingle();
    if (profileError || !profile?.id) {
      throw new Error(`CEO profile not found for ${CEO_EMAIL}: ${profileError?.message ?? "missing"}`);
    }

    const { data: member, error: memberError } = await admin
      .from("organization_members")
      .select("org_id, user_id")
      .eq("user_id", profile.id)
      .limit(1)
      .maybeSingle();
    if (memberError || !member?.org_id) {
      throw new Error(`No org membership for ${CEO_EMAIL}: ${memberError?.message ?? "missing"}`);
    }

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", member.org_id)
      .single();
    if (orgError || !org?.id) {
      throw new Error(orgError?.message ?? "Organization not found");
    }
    orgId = org.id;
    console.log(`[e2e-twin] org=${org.id} (${org.name ?? "unnamed"}) user=${profile.id} (${profile.email})`);

    const { data: project } = await admin
      .from("projects")
      .insert({ name: `${prefix}-project`, org_id: org.id, created_by: member.user_id })
      .select("id")
      .single();
    cleanup.push(() => admin.from("projects").delete().eq("id", project.id));

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .insert({
        org_id: org.id,
        project_id: project.id,
        created_by: member.user_id,
        title: VIDEO_FILE ? `${prefix}` : `${prefix} Quick Scan`,
        status: "draft",
      })
      .select("id")
      .single();
    spaceId = space.id;
    if (!KEEP_DATA) cleanup.push(() => admin.from("digital_twin_spaces").delete().eq("id", space.id));

    const { data: capture } = await admin
      .from("digital_twin_captures")
      .insert({
        org_id: org.id,
        space_id: space.id,
        project_id: project.id,
        created_by: member.user_id,
        title: `${prefix} capture`,
        capture_status: "uploading",
      })
      .select("id")
      .single();
    captureId = capture.id;

    const assetIds = [];
    let uploaded = 0;

    if (VIDEO_FILE) {
      const videoPath = path.resolve(VIDEO_FILE);
      if (!fs.existsSync(videoPath)) {
        throw new Error(`E2E_TWIN_VIDEO not found: ${videoPath}`);
      }
      const body = fs.readFileSync(videoPath);
      const filename = path.basename(videoPath);
      const storageKey = buildTwinKey(org.id, space.id, capture.id, filename);
      const contentType = filename.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
      console.log(`[e2e-twin] uploading video ${filename} (${body.length} bytes) → ${storageKey}`);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: body,
          ContentType: contentType,
        }),
      );
      const { data: asset } = await admin
        .from("digital_twin_capture_assets")
        .insert({
          org_id: org.id,
          space_id: space.id,
          capture_id: capture.id,
          asset_kind: "video",
          upload_tier: "standard",
          content_type: contentType,
          file_size_bytes: body.length,
          storage_key: storageKey,
          status: "ready",
        })
        .select("id, storage_key")
        .single();
      assetIds.push(asset.id);
      uploaded = 1;
      stages.sourceUploaded = `pass (1 video, ${body.length} bytes, key=${storageKey})`;
    } else {
      for (const name of PHOTO_NAMES) {
        const filePath = path.join(PHOTO_DIR, name);
        if (!fs.existsSync(filePath)) continue;
        const body = fs.readFileSync(filePath);
        const storageKey = buildTwinKey(org.id, space.id, capture.id, name);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storageKey,
            Body: body,
            ContentType: "image/png",
          }),
        );

        const { data: asset } = await admin
          .from("digital_twin_capture_assets")
          .insert({
            org_id: org.id,
            space_id: space.id,
            capture_id: capture.id,
            asset_kind: "photo",
            upload_tier: "standard",
            content_type: "image/png",
            file_size_bytes: body.length,
            storage_key: storageKey,
            status: "ready",
          })
          .select("id, storage_key")
          .single();
        assetIds.push(asset.id);
        uploaded += 1;
      }
      stages.sourceUploaded = uploaded >= 4 ? `pass (${uploaded} photos)` : `fail (${uploaded} photos)`;
    }

    if (uploaded < 1) {
      stages.sourceUploaded = "fail (no assets uploaded)";
      throw new Error(stages.sourceUploaded);
    }

    await admin
      .from("digital_twin_captures")
      .update({ capture_status: "ready" })
      .eq("id", capture.id);

    const { data: job, error: jobError } = await admin
      .from("digital_twin_processing_jobs")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        created_by: member.user_id,
        job_type: "gaussian_splat",
        status: "queued",
        input_asset_ids: assetIds,
        output_format: "spz",
      })
      .select("id, status")
      .single();

    if (jobError || !job?.id) {
      stages.jobQueued = `fail: ${jobError?.message ?? "no row"}`;
      throw new Error(stages.jobQueued);
    }
    jobId = job.id;
    stages.jobQueued = `pass (${job.id})`;

    const { tasks } = await import("@trigger.dev/sdk/v3");
    const handle = await tasks.trigger(
      "twin.gaussian_splat",
      { jobId: job.id },
      undefined,
      { clientConfig: { previewBranch: "" } },
    );
    stages.triggerFired = handle?.id ? `pass (run=${handle.id})` : "fail: no run id";

    const started = Date.now();
    let lastStatus = "queued";

    while (Date.now() - started < MAX_WAIT_MS) {
      await sleep(POLL_MS);
      const { data: row } = await admin
        .from("digital_twin_processing_jobs")
        .select("id, status, worker_run_id, error_text, output_storage_key, output_model_id, progress_pct")
        .eq("id", job.id)
        .single();

      if (!row) break;
      lastStatus = row.status;
      console.log(
        `[e2e-twin] poll status=${row.status} progress=${row.progress_pct ?? 0}% worker_run_id=${row.worker_run_id ?? "—"}`,
      );

      if (row.worker_run_id && stages.modalDispatched.startsWith("pending")) {
        stages.modalDispatched = `pass (worker_run_id=${row.worker_run_id})`;
      }

      if (row.status === "completed") {
        stages.callbackVerified = row.output_storage_key?.endsWith(".spz")
          ? `pass (key=${row.output_storage_key})`
          : `fail: missing spz key (${row.output_storage_key ?? "null"})`;

        const { data: model } = await admin
          .from("digital_twin_models")
          .select("id, storage_key, file_size_bytes, model_format, status")
          .eq("id", row.output_model_id)
          .maybeSingle();

        if (model?.storage_key?.endsWith(".spz") && Number(model.file_size_bytes) > 0) {
          modelId = model.id;
          stages.modelRow = `pass (id=${model.id}, size=${model.file_size_bytes}, key=${model.storage_key})`;
        } else {
          stages.modelRow = `fail: ${JSON.stringify(model)}`;
        }
        break;
      }

      if (row.status === "failed") {
        stages.callbackVerified = `fail: ${row.error_text ?? "unknown"}`;
        stages.modalDispatched = row.worker_run_id
          ? `partial (modal ran, failed: ${row.error_text ?? "unknown"})`
          : stages.modalDispatched;
        if (String(row.error_text ?? "").includes("max_num_elems > 0")) {
          console.error("[e2e-twin] COLMAP max_num_elems abort detected — stopping poll.");
        }
        break;
      }
    }

    if (lastStatus !== "completed" && lastStatus !== "failed") {
      stages.callbackVerified = `timeout (last status=${lastStatus})`;
    }

    if (modelId) {
      const twinUrl = `${baseUrl}/digital-twin/twins/${spaceId}`;
      const twinRes = await fetch(twinUrl, { redirect: "manual" });
      stages.twinPage = twinRes.status === 200 || twinRes.status === 307 || twinRes.status === 308
        ? `pass (${twinUrl}, HTTP ${twinRes.status})`
        : `fail (${twinUrl}, HTTP ${twinRes.status})`;

      shareToken = randomBytes(24).toString("base64url");
      await admin.from("digital_twin_share_tokens").insert({
        token: shareToken,
        org_id: org.id,
        space_id: space.id,
        created_by: member.user_id,
        role: "view",
        label: `${prefix} share`,
      });
      const shareUrl = `${baseUrl}/share/twin/${shareToken}`;
      const shareRes = await fetch(shareUrl, { redirect: "manual" });
      stages.shareLink = shareRes.status === 200 ? `pass (${shareUrl})` : `fail (${shareUrl}, HTTP ${shareRes.status})`;
    }

    console.log("\n[e2e-twin] Stage report:");
    for (const [key, value] of Object.entries(stages)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log("\n[e2e-twin] IDs:");
    console.log(`  org_id:     ${orgId ?? "—"}`);
    console.log(`  space_id:   ${spaceId ?? "—"}`);
    console.log(`  capture_id: ${captureId ?? "—"}`);
    console.log(`  job_id:     ${jobId ?? "—"}`);
    console.log(`  model_id:   ${modelId ?? "—"}`);
    if (spaceId) {
      console.log(`  viewer:     ${baseUrl}/digital-twin/twins/${spaceId}`);
    }
    if (shareToken) {
      console.log(`  share:      ${baseUrl}/share/twin/${shareToken}`);
    }

    const failed = Object.values(stages).some((v) => String(v).startsWith("fail") || String(v).startsWith("timeout"));
    process.exit(failed ? 1 : 0);
  } catch (err) {
    console.error("[e2e-twin] Error:", err instanceof Error ? err.message : err);
    console.log("\n[e2e-twin] Partial stage report:");
    for (const [key, value] of Object.entries(stages)) {
      console.log(`  ${key}: ${value}`);
    }
    process.exit(1);
  }
}

main();
