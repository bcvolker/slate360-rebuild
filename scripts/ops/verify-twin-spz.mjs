#!/usr/bin/env node
/**
 * Verify Digital Twin .spz objects in R2 for Spark-compatible gzip v3 headers.
 *
 * Modes:
 *   --model-key <r2Key>   Inspect one object by storage key
 *   --space-id <uuid>     Resolve latest ready model for a space, then inspect
 *   --all                 Fleet scan of every ready digital_twin_models row
 *   --reprocess-list      Emit re-queue checklist for pre-fix or bad-header models
 *
 * Usage:
 *   node scripts/ops/verify-twin-spz.mjs --model-key orgs/.../models/<jobId>.spz
 *   node scripts/ops/verify-twin-spz.mjs --space-id <uuid>
 *   node scripts/ops/verify-twin-spz.mjs --all
 *   node scripts/ops/verify-twin-spz.mjs --reprocess-list
 */

import fs from "node:fs";
import zlib from "node:zlib";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const SPZ_FIX_DATE = "2026-06-09";
const SPZ_FIX_MS = Date.parse(`${SPZ_FIX_DATE}T00:00:00.000Z`);
const NGSP_MAGIC = 0x5053474e; // "NGSP" little-endian
const HEADER_RANGE_BYTES = 256 * 1024;
const FULL_FETCH_MAX_BYTES = 32 * 1024 * 1024;
const FLEET_BATCH_DELAY_MS = 120;

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

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1]?.trim() : "";
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveR2Endpoint() {
  const configured = getEnv("R2_ENDPOINT");
  if (configured) return configured;
  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID");
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
}

function buildStorageConfig() {
  const r2 = {
    accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    endpoint: resolveR2Endpoint(),
    bucket: getEnv("R2_BUCKET"),
    region: getEnv("R2_REGION") || "auto",
  };
  const aws = {
    accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
    bucket: getEnv("SLATEDROP_S3_BUCKET") || "slate360-storage",
    region: getEnv("AWS_REGION") || "us-east-2",
  };
  const hasFullR2 = Boolean(r2.accessKeyId && r2.secretAccessKey && r2.endpoint && r2.bucket);
  const hasFullAws = Boolean(aws.accessKeyId && aws.secretAccessKey && aws.region);
  if (hasFullR2) {
    return { provider: "r2", bucket: r2.bucket, region: r2.region, endpoint: r2.endpoint, credentials: r2 };
  }
  if (hasFullAws) {
    return {
      provider: "aws",
      bucket: aws.bucket,
      region: aws.region,
      endpoint: "",
      credentials: aws,
    };
  }
  return null;
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function isPreFix(createdAt) {
  if (!createdAt) return null;
  return Date.parse(createdAt) < SPZ_FIX_MS;
}

function headerVerdict(check) {
  if (check.sparkCompatible) return "OK (gzip v3)";
  if (check.status === "ngsp-v4") return "BAD (NGSP v4 — Spark reads gzip v3 only)";
  if (check.status === "gzip-version-mismatch") return `BAD (gzip SPZ v${check.version} — need v3)`;
  if (check.status === "bad-magic") return "BAD (missing NGSP magic after gzip)";
  if (check.status === "not-gzip-ngsp") return `BAD (plaintext NGSP v${check.version ?? "?"})`;
  if (check.status === "not-gzip-unknown") return `BAD (unknown magic ${check.rawMagicHex ?? "?"})`;
  if (check.status === "missing-object") return "MISSING (object not in bucket)";
  if (check.status === "fetch-error") return `ERROR (${check.error ?? "fetch failed"})`;
  if (check.status === "inflate-failed") return `ERROR (gzip inflate: ${check.error ?? "?"})`;
  if (check.status === "truncated") return "ERROR (object too small)";
  return `UNKNOWN (${check.status})`;
}

function needsReprocess(row, check) {
  const preFix = isPreFix(row.created_at);
  if (preFix === true) return { reason: "pre-fix", detail: `created before ${SPZ_FIX_DATE}` };
  if (!check.sparkCompatible) {
    return { reason: "bad-header", detail: headerVerdict(check) };
  }
  return null;
}

function gunzipHeaderPrefix(raw) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const gunzip = zlib.createGunzip();
    const finish = () => resolve(Buffer.concat(chunks));

    gunzip.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length >= 16) {
        gunzip.destroy();
        finish();
      }
    });
    gunzip.on("error", (err) => {
      const buf = Buffer.concat(chunks);
      if (buf.length >= 8) finish();
      else reject(err);
    });
    gunzip.on("end", finish);
    gunzip.end(raw);
  });
}

async function inflateGzipForHeader(raw, objectSize) {
  try {
    return zlib.gunzipSync(raw);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const partialOk = msg.includes("unexpected end") || msg.includes("Z_BUF_ERROR");
    if (!partialOk) throw error;
    return gunzipHeaderPrefix(raw);
  }
}

async function analyzeSpzBytes(raw, objectSize = null) {
  const first16 = raw.subarray(0, Math.min(16, raw.length));
  const gzipMagic = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;

  if (gzipMagic) {
    try {
      const inflated = await inflateGzipForHeader(raw, objectSize);
      if (inflated.length < 8) {
        return {
          status: "truncated",
          gzipMagic: true,
          sparkCompatible: false,
          first16Hex: first16.toString("hex"),
        };
      }
      const magic = inflated.readUInt32LE(0);
      const version = inflated.readUInt32LE(4);
      if (magic !== NGSP_MAGIC) {
        return {
          status: "bad-magic",
          gzipMagic: true,
          magicHex: magic.toString(16).padStart(8, "0"),
          version,
          sparkCompatible: false,
          first16Hex: first16.toString("hex"),
        };
      }
      const sparkCompatible = version === 3;
      return {
        status: sparkCompatible ? "gzip-v3" : "gzip-version-mismatch",
        gzipMagic: true,
        version,
        numPoints: inflated.length >= 12 ? inflated.readUInt32LE(8) : null,
        sparkCompatible,
        first16Hex: first16.toString("hex"),
        inflatedHeaderHex: inflated.subarray(0, 16).toString("hex"),
      };
    } catch (error) {
      return {
        status: "inflate-failed",
        gzipMagic: true,
        sparkCompatible: false,
        error: error instanceof Error ? error.message : String(error),
        first16Hex: first16.toString("hex"),
      };
    }
  }

  if (raw.length >= 8) {
    const magic = raw.readUInt32LE(0);
    const version = raw.readUInt32LE(4);
    if (magic === NGSP_MAGIC) {
      return {
        status: version >= 4 ? "ngsp-v4" : "not-gzip-ngsp",
        gzipMagic: false,
        version,
        sparkCompatible: false,
        first16Hex: first16.toString("hex"),
      };
    }
    return {
      status: "not-gzip-unknown",
      gzipMagic: false,
      rawMagicHex: raw.subarray(0, 4).toString("hex"),
      sparkCompatible: false,
      first16Hex: first16.toString("hex"),
    };
  }

  return {
    status: "truncated",
    gzipMagic: false,
    sparkCompatible: false,
    first16Hex: first16.toString("hex"),
  };
}

async function getObjectBytes(s3, bucket, key, range) {
  const input = { Bucket: bucket, Key: key };
  if (range) input.Range = range;
  const obj = await s3.send(new GetObjectCommand(input));
  return Buffer.from(await obj.Body.transformToByteArray());
}

async function fetchObjectProbe(s3, bucket, key) {
  let objectSize = null;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    objectSize = head.ContentLength ?? null;
  } catch (error) {
    const code = error?.name ?? error?.Code;
    if (code === "NotFound" || code === "NoSuchKey") {
      return { objectSize: null, raw: null, check: { status: "missing-object", sparkCompatible: false } };
    }
    return {
      objectSize: null,
      raw: null,
      check: {
        status: "fetch-error",
        sparkCompatible: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }

  const fetchFull =
    objectSize != null && objectSize > 0 && objectSize <= FULL_FETCH_MAX_BYTES;
  const rangeEnd = fetchFull
    ? objectSize - 1
    : objectSize != null
      ? Math.min(objectSize - 1, HEADER_RANGE_BYTES - 1)
      : HEADER_RANGE_BYTES - 1;
  const range = rangeEnd >= 0 ? `bytes=0-${rangeEnd}` : undefined;

  try {
    const raw = await getObjectBytes(s3, bucket, key, range);
    const check = await analyzeSpzBytes(raw, objectSize);
    return { objectSize, raw, check };
  } catch (error) {
    return {
      objectSize,
      raw: null,
      check: {
        status: "fetch-error",
        sparkCompatible: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function extractMetrics(row) {
  const qm = row?.quality_metrics && typeof row.quality_metrics === "object" ? row.quality_metrics : {};
  const splatCount = qm.splatCount ?? qm.splat_count ?? null;
  return { quality_metrics: qm, splatCount };
}

function printOperatorChecklist() {
  console.log("\n=== Operator manual checks (dashboards) ===");
  console.log(
    `1. Modal → app "slate360-twin-gaussian-splat": confirm deployed revision date is ON OR AFTER ${SPZ_FIX_DATE}`,
  );
  console.log("   (commit b701feae forced --spz-version 3; an older Modal deploy still emits NGSP v4.)");
  console.log(
    "2. If a FRESH twin (processed after Modal redeploy) still fails Mode A header check → escalate to",
  );
  console.log("   export-filter suspect: worker.py SPLAT_OPACITY_TIERS / SPLAT_SCALE_CAP (do not patch in this script).");
  console.log("3. Re-queue bad/pre-fix twins with: node scripts/ops/reprocess-twin-capture.mjs --capture-id … --model-id …");
}

function printSingleReport({ label, storageKey, objectSize, dbSize, check, metrics, row }) {
  console.log(`\n=== SPZ verify: ${label} ===`);
  console.log(`storage_key: ${storageKey}`);
  if (row?.id) console.log(`model_id:    ${row.id}`);
  if (row?.space_id) console.log(`space_id:    ${row.space_id}`);
  if (row?.capture_id) console.log(`capture_id:  ${row.capture_id}`);
  if (row?.processing_job_id) console.log(`job_id:      ${row.processing_job_id}`);
  if (row?.created_at) {
    const pre = isPreFix(row.created_at);
    console.log(`created_at:  ${row.created_at} (${pre ? "PRE" : "POST"} ${SPZ_FIX_DATE})`);
  }
  console.log(`file_size:   ${formatBytes(objectSize ?? dbSize ?? row?.file_size_bytes)} (R2 head / DB)`);
  if (metrics.splatCount != null) console.log(`splat_count: ${metrics.splatCount} (quality_metrics)`);
  if (Object.keys(metrics.quality_metrics).length) {
    console.log(`quality_metrics: ${JSON.stringify(metrics.quality_metrics)}`);
  }
  console.log(`first16_hex: ${check.first16Hex ?? "—"}`);
  console.log(`gzip_magic:  ${check.gzipMagic === true ? "yes (1f 8b)" : check.gzipMagic === false ? "no" : "—"}`);
  if (check.version != null) console.log(`spz_version: ${check.version} (after gzip inflate or plaintext header)`);
  if (check.inflatedHeaderHex) console.log(`inflated_hdr: ${check.inflatedHeaderHex}`);
  console.log(`verdict:     ${headerVerdict(check)}`);
}

async function resolveModelBySpace(admin, spaceId) {
  const { data: space, error: spaceErr } = await admin
    .from("digital_twin_spaces")
    .select("id, published_model_id")
    .eq("id", spaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (spaceErr || !space) {
    throw new Error(`Space not found: ${spaceErr?.message ?? spaceId}`);
  }

  let query = admin
    .from("digital_twin_models")
    .select(
      "id, space_id, capture_id, processing_job_id, storage_key, file_size_bytes, quality_metrics, created_at, status",
    )
    .eq("space_id", spaceId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (space.published_model_id) {
    query = admin
      .from("digital_twin_models")
      .select(
        "id, space_id, capture_id, processing_job_id, storage_key, file_size_bytes, quality_metrics, created_at, status",
      )
      .eq("id", space.published_model_id)
      .eq("status", "ready")
      .is("deleted_at", null)
      .maybeSingle();
    const { data, error } = await query;
    if (error || !data?.storage_key) throw new Error(`Published model not ready: ${error?.message ?? spaceId}`);
    return data;
  }

  const { data, error } = await query;
  if (error || !data?.[0]?.storage_key) {
    throw new Error(`No ready model for space ${spaceId}: ${error?.message ?? "empty"}`);
  }
  return data[0];
}

async function resolveModelByKey(admin, storageKey) {
  const { data } = await admin
    .from("digital_twin_models")
    .select(
      "id, space_id, capture_id, processing_job_id, storage_key, file_size_bytes, quality_metrics, created_at, status",
    )
    .eq("storage_key", storageKey)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function fetchAllReadyModels(admin) {
  const pageSize = 200;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("digital_twin_models")
      .select(
        "id, space_id, capture_id, processing_job_id, storage_key, file_size_bytes, quality_metrics, created_at, status",
      )
      .eq("status", "ready")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function inspectOne(s3, bucket, storageKey, row, label) {
  const { objectSize, check } = await fetchObjectProbe(s3, bucket, storageKey);
  const metrics = extractMetrics(row);
  printSingleReport({
    label,
    storageKey,
    objectSize,
    dbSize: row?.file_size_bytes,
    check,
    metrics,
    row,
  });
  return { storageKey, objectSize, check, row, metrics };
}

async function runFleetScan(s3, bucket, admin, { reprocessOnly }) {
  const models = await fetchAllReadyModels(admin);
  console.log(`\n=== Fleet scan: ${models.length} ready model(s) ===`);
  console.log(
    "model_id · space_id · created_at · file_size · pre/post fix · header_check",
  );

  const reprocessRows = [];
  let ok = 0;
  let bad = 0;

  for (let i = 0; i < models.length; i++) {
    const row = models[i];
    const { objectSize, check } = await fetchObjectProbe(s3, bucket, row.storage_key);
    const pre = isPreFix(row.created_at);
    const preLabel = pre == null ? "?" : pre ? "PRE" : "POST";
    const verdict = headerVerdict(check);
    const sizeLabel = formatBytes(objectSize ?? row.file_size_bytes);

    console.log(
      `${row.id} · ${row.space_id} · ${row.created_at} · ${sizeLabel} · ${preLabel} · ${verdict}`,
    );

    if (check.sparkCompatible) ok += 1;
    else bad += 1;

    const rp = needsReprocess(row, check);
    if (rp) {
      reprocessRows.push({ row, check, ...rp });
    }

    if (i < models.length - 1) await sleep(FLEET_BATCH_DELAY_MS);
  }

  console.log(`\nSummary: ${ok} spark-compatible · ${bad} need attention · ${models.length} total`);

  if (reprocessOnly) {
    console.log("\n=== Reprocess checklist (manual re-queue — not executed by this script) ===");
    if (!reprocessRows.length) {
      console.log("(none — all ready models pass header check and are post-fix date)");
    } else {
      for (const item of reprocessRows) {
        const { row, reason, detail } = item;
        console.log(
          `- [ ] space_id=${row.space_id} capture_id=${row.capture_id ?? "—"} job_id=${row.processing_job_id ?? "—"} model_id=${row.id} reason=${reason} (${detail})`,
        );
      }
    }
  }

  return { models, reprocessRows, ok, bad };
}

async function main() {
  loadDotEnvFile(".env");
  loadDotEnvFile(".env.local");

  const modelKey = arg("model-key");
  const spaceId = arg("space-id");
  const fleetAll = hasFlag("all");
  const reprocessList = hasFlag("reprocess-list");

  const modeCount = [Boolean(modelKey), Boolean(spaceId), fleetAll || reprocessList].filter(Boolean).length;
  if (modeCount !== 1) {
    console.error(
      "Usage: pick exactly one mode:\n" +
        "  --model-key <r2Key>\n" +
        "  --space-id <uuid>\n" +
        "  --all\n" +
        "  --reprocess-list",
    );
    process.exit(1);
  }

  const storage = buildStorageConfig();
  if (!storage?.credentials?.accessKeyId || !storage.bucket) {
    console.error("Missing R2_* or AWS_* storage credentials (see lib/s3.ts conventions).");
    process.exit(1);
  }

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const s3 = new S3Client({
    region: storage.region,
    endpoint: storage.endpoint || undefined,
    forcePathStyle: getEnv("S3_FORCE_PATH_STYLE") === "true",
    credentials: {
      accessKeyId: storage.credentials.accessKeyId,
      secretAccessKey: storage.credentials.secretAccessKey,
    },
  });

  console.log(`[verify-twin-spz] storage=${storage.provider} bucket=${storage.bucket}`);

  if (modelKey) {
    const row = await resolveModelByKey(admin, modelKey);
    await inspectOne(s3, storage.bucket, modelKey, row, row?.id ?? modelKey);
  } else if (spaceId) {
    const row = await resolveModelBySpace(admin, spaceId);
    await inspectOne(s3, storage.bucket, row.storage_key, row, row.id);
  } else {
    await runFleetScan(s3, storage.bucket, admin, { reprocessOnly: reprocessList });
  }

  printOperatorChecklist();
}

main().catch((err) => {
  console.error("[verify-twin-spz] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
