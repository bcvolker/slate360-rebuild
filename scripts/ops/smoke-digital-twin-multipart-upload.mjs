#!/usr/bin/env node

/**
 * Simulated Digital Twin multipart upload against R2 (single 64 KiB part).
 * Validates CreateMultipartUpload → presigned PUT → CompleteMultipartUpload.
 *
 * Usage: node scripts/ops/smoke-digital-twin-multipart-upload.mjs
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

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const bucket = getEnv("R2_BUCKET") || "slate360-storage";
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const endpoint =
    getEnv("R2_ENDPOINT") ||
    (getEnv("CLOUDFLARE_ACCOUNT_ID")
      ? `https://${getEnv("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
      : "");

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.log("[smoke-dt-multipart] SKIPPED: missing R2 credentials");
    process.exit(0);
  }

  const s3 = new S3Client({
    region: getEnv("R2_REGION") || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const testKey = `__dt_smoke_multipart/${Date.now()}_smoke.bin`;
  const body = Buffer.alloc(64 * 1024, 0xab);
  let uploadId = null;

  try {
    const created = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: testKey,
        ContentType: "application/octet-stream",
      }),
    );
    uploadId = created.UploadId;
    if (!uploadId) throw new Error("No UploadId from CreateMultipartUpload");

    const putUrl = await getSignedUrl(
      s3,
      new UploadPartCommand({
        Bucket: bucket,
        Key: testKey,
        UploadId: uploadId,
        PartNumber: 1,
      }),
      { expiresIn: 600 },
    );

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body,
    });

    if (!putRes.ok) {
      throw new Error(`Presigned PUT failed: HTTP ${putRes.status} ${await putRes.text()}`);
    }

    const etag = putRes.headers.get("etag") ?? putRes.headers.get("ETag");
    if (!etag) {
      throw new Error("PUT succeeded but ETag header missing (check R2 CORS ExposeHeaders)");
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: testKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [{ ETag: etag.replace(/^"|"$/g, ""), PartNumber: 1 }],
        },
      }),
    );

    console.log("[smoke-dt-multipart] PASS");
    console.log(`  key=${testKey}`);
    console.log(`  etag=${etag}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[smoke-dt-multipart] FAIL:", msg);
    if (uploadId) {
      try {
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: testKey,
            UploadId: uploadId,
          }),
        );
      } catch {
        // best-effort
      }
    }
    process.exit(1);
  } finally {
    await s3
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }))
      .catch(() => {});
  }
}

main().catch((err) => {
  console.error("[smoke-dt-multipart] Unexpected:", err);
  process.exit(1);
});
