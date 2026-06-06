#!/usr/bin/env node

/**
 * End-to-end Digital Twin upload pipeline smoke (admin + R2, mirrors API route behavior).
 * Validates: multipart init→sign→complete, storage_key, increment_org_storage, abort, job queued.
 *
 * Usage: node scripts/ops/smoke-digital-twin-upload-pipeline.mjs
 */

import fs from "node:fs";
import path from "node:path";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

const PART_BYTES = 8 * 1024 * 1024;
const FILE_BYTES = PART_BYTES + 512 * 1024;

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

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

  if (!supabaseUrl || !serviceRole) {
    console.log("[smoke-dt-pipeline] SKIPPED: missing Supabase credentials");
    process.exit(0);
  }
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.log("[smoke-dt-pipeline] SKIPPED: missing R2 credentials");
    process.exit(0);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const s3 = new S3Client({
    region: getEnv("R2_REGION") || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = `__dt_pipe_${Date.now()}__`;
  const cleanup = [];
  const results = {
    multipart: "pending",
    storage: "pending",
    storageQuota: "pending",
    abort: "pending",
    job: "pending",
  };

  try {
    const { data: org } = await admin.from("organizations").select("id").limit(1).single();
    const { data: member } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", org.id)
      .limit(1)
      .single();

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
        title: `${prefix} space`,
        status: "draft",
      })
      .select("id")
      .single();
    cleanup.push(() => admin.from("digital_twin_spaces").delete().eq("id", space.id));

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

    const storageKey = buildTwinKey(org.id, space.id, capture.id, "smoke.bin");
    const totalParts = 2;

    const { data: asset } = await admin
      .from("digital_twin_capture_assets")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        asset_kind: "video",
        upload_tier: "standard",
        content_type: "application/octet-stream",
        file_size_bytes: FILE_BYTES,
        status: "uploading",
      })
      .select("id")
      .single();

    const created = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: storageKey,
        ContentType: "application/octet-stream",
      }),
    );

    const { data: multipart } = await admin
      .from("digital_twin_multipart_uploads")
      .insert({
        org_id: org.id,
        asset_id: asset.id,
        storage_key: storageKey,
        s3_upload_id: created.UploadId,
        content_type: "application/octet-stream",
        total_parts: totalParts,
        part_size_bytes: PART_BYTES,
        status: "initiated",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();

    const body = Buffer.alloc(FILE_BYTES, 0xcd);
    const parts = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_BYTES;
      const chunk = body.subarray(start, Math.min(start + PART_BYTES, FILE_BYTES));
      const putUrl = await getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: bucket,
          Key: storageKey,
          UploadId: created.UploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 600 },
      );
      const putRes = await fetch(putUrl, { method: "PUT", body: chunk });
      if (!putRes.ok) throw new Error(`Part ${partNumber} PUT failed: ${putRes.status}`);
      const etag = putRes.headers.get("etag") ?? putRes.headers.get("ETag");
      if (!etag) throw new Error("Missing ETag");
      parts.push({ ETag: etag.replace(/^"|"$/g, ""), PartNumber: partNumber });
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: storageKey,
        UploadId: created.UploadId,
        MultipartUpload: { Parts: parts },
      }),
    );

    await admin
      .from("digital_twin_capture_assets")
      .update({ storage_key: storageKey, status: "ready" })
      .eq("id", asset.id);

    await admin
      .from("digital_twin_multipart_uploads")
      .update({ status: "completed", completed_parts: totalParts })
      .eq("id", multipart.id);

    const { data: assetAfter } = await admin
      .from("digital_twin_capture_assets")
      .select("storage_key, status")
      .eq("id", asset.id)
      .single();

    results.multipart =
      assetAfter?.storage_key === storageKey && assetAfter?.status === "ready"
        ? "pass"
        : `fail: key=${assetAfter?.storage_key} status=${assetAfter?.status}`;

    const { data: orgBefore } = await admin
      .from("organizations")
      .select("org_storage_used_bytes")
      .eq("id", org.id)
      .single();
    const { data: quotaBeforeRpc, error: quotaBeforeError } = await admin.rpc("get_storage_used", {
      p_org_id: org.id,
    });
    await admin.rpc("increment_org_storage", { target_org_id: org.id, bytes_delta: FILE_BYTES });
    const { data: orgAfter } = await admin
      .from("organizations")
      .select("org_storage_used_bytes")
      .eq("id", org.id)
      .single();
    const { data: quotaAfterRpc, error: quotaAfterError } = await admin.rpc("get_storage_used", {
      p_org_id: org.id,
    });
    const columnDelta =
      Number(orgAfter?.org_storage_used_bytes) - Number(orgBefore?.org_storage_used_bytes);
    results.storage =
      columnDelta >= FILE_BYTES
        ? `pass (+${columnDelta} org_storage_used_bytes)`
        : `fail: delta=${columnDelta}`;

    if (quotaBeforeError || quotaAfterError) {
      results.storageQuota = `fail: rpc ${quotaBeforeError?.message ?? quotaAfterError?.message}`;
    } else {
      const quotaDelta = Number(quotaAfterRpc) - Number(quotaBeforeRpc);
      const columnMatchesQuota = Number(quotaAfterRpc) === Number(orgAfter?.org_storage_used_bytes);
      results.storageQuota =
        quotaDelta >= FILE_BYTES && columnMatchesQuota
          ? `pass (+${quotaDelta} via get_storage_used)`
          : `fail: quotaDelta=${quotaDelta} columnMatch=${columnMatchesQuota}`;
    }

    const abortKey = buildTwinKey(org.id, space.id, capture.id, "abort.bin");
    const abortCreated = await s3.send(
      new CreateMultipartUploadCommand({ Bucket: bucket, Key: abortKey, ContentType: "application/octet-stream" }),
    );
    const { data: abortAsset } = await admin
      .from("digital_twin_capture_assets")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        asset_kind: "other",
        file_size_bytes: 1024,
        status: "uploading",
      })
      .select("id")
      .single();
    const { data: abortMultipart } = await admin
      .from("digital_twin_multipart_uploads")
      .insert({
        org_id: org.id,
        asset_id: abortAsset.id,
        storage_key: abortKey,
        s3_upload_id: abortCreated.UploadId,
        total_parts: 1,
        part_size_bytes: 1024,
        status: "initiated",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();

    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: abortKey,
        UploadId: abortCreated.UploadId,
      }),
    );
    await admin
      .from("digital_twin_multipart_uploads")
      .update({ status: "aborted" })
      .eq("id", abortMultipart.id);
    await admin
      .from("digital_twin_capture_assets")
      .update({ status: "failed" })
      .eq("id", abortAsset.id);

    const { data: abortAfter } = await admin
      .from("digital_twin_multipart_uploads")
      .select("status")
      .eq("id", abortMultipart.id)
      .single();
    results.abort = abortAfter?.status === "aborted" ? "pass" : `fail: ${abortAfter?.status}`;

    const { data: job } = await admin
      .from("digital_twin_processing_jobs")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        created_by: member.user_id,
        job_type: "gaussian_splat",
        status: "queued",
        input_asset_ids: [asset.id],
        output_format: "spz",
      })
      .select("id, status")
      .single();
    cleanup.push(() => admin.from("digital_twin_processing_jobs").delete().eq("id", job.id));
    results.job = job?.status === "queued" ? `pass (${job.id})` : `fail: ${job?.status}`;

    console.log("[smoke-dt-pipeline] Results:");
    console.log(`  multipart complete: ${results.multipart}`);
    console.log(`  storage metering:   ${results.storage}`);
    console.log(`  storage quota RPC:  ${results.storageQuota}`);
    console.log(`  abort:              ${results.abort}`);
    console.log(`  job queued:         ${results.job}`);

    const failed = Object.values(results).some((v) => String(v).startsWith("fail"));
    if (failed) {
      console.error("\n[smoke-dt-pipeline] FAILED");
      process.exit(1);
    }
    console.log("\n[smoke-dt-pipeline] PASS");
  } finally {
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        // best-effort
      }
    }
  }
}

main().catch((err) => {
  console.error("[smoke-dt-pipeline] Unexpected:", err);
  process.exit(1);
});
