#!/usr/bin/env node
/**
 * Compare raw SPZ position min/max vs 2nd–98th percentile bounds for a twin model.
 * Usage: node scripts/ops/diagnose-splat-bounds.mjs [modelIdPrefix]
 */
import fs from "node:fs";
import path from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { SpzReader } from "@sparkjsdev/spark";

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

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function metrics(min, max) {
  return {
    min: [min.x, min.y, min.z],
    max: [max.x, max.y, max.z],
    size: [max.x - min.x, max.y - min.y, max.z - min.z],
  };
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const modelPrefix = process.argv[2] ?? "e6e638a0";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let model = null;
let error = null;

if (modelPrefix.length >= 32) {
  const res = await admin
    .from("digital_twin_models")
    .select("id, storage_key, title")
    .eq("id", modelPrefix)
    .maybeSingle();
  model = res.data;
  error = res.error;
} else {
  const res = await admin
    .from("digital_twin_models")
    .select("id, storage_key, title")
    .ilike("storage_key", `%${modelPrefix}%`)
    .limit(1)
    .maybeSingle();
  model = res.data;
  error = res.error;
}

if (error || !model?.storage_key) {
  console.error("Model not found for prefix", modelPrefix, error?.message);
  process.exit(1);
}

console.log("[diagnose] model", model.id, model.title);
console.log("[diagnose] storage_key", model.storage_key);

const bucket = process.env.R2_BUCKET || "slate360-storage";
const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");

const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: model.storage_key }));
const bytes = Buffer.from(await obj.Body.transformToByteArray());

const xs = [];
const ys = [];
const zs = [];

const reader = new SpzReader({ fileBytes: bytes });
await reader.parseHeader();
await reader.parseSplats((_i, x, y, z) => {
  xs.push(x);
  ys.push(y);
  zs.push(z);
});

xs.sort((a, b) => a - b);
ys.sort((a, b) => a - b);
zs.sort((a, b) => a - b);

const rawMin = { x: xs[0], y: ys[0], z: zs[0] };
const rawMax = { x: xs[xs.length - 1], y: ys[ys.length - 1], z: zs[zs.length - 1] };
const trimMin = {
  x: percentile(xs, 0.02),
  y: percentile(ys, 0.02),
  z: percentile(zs, 0.02),
};
const trimMax = {
  x: percentile(xs, 0.98),
  y: percentile(ys, 0.98),
  z: percentile(zs, 0.98),
};

console.log(
  JSON.stringify(
    {
      modelId: model.id,
      numSplats: xs.length,
      raw: metrics(rawMin, rawMax),
      trimmedPercentile2to98: metrics(trimMin, trimMax),
      rawMaxDim: Math.max(rawMax.x - rawMin.x, rawMax.y - rawMin.y, rawMax.z - rawMin.z),
      trimmedMaxDim: Math.max(trimMax.x - trimMin.x, trimMax.y - trimMin.y, trimMax.z - trimMin.z),
    },
    null,
    2,
  ),
);
