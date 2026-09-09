// Upload viewer sidecars (manifest / walk / cameras JSON) next to a published splat in R2.
// usage: node scripts/local-splat/upload-sidecars.mjs <storage_key.spz> <file.json> [<file.json> ...]
// Each file is stored as <storage_key minus .spz>.<suffix> where suffix is taken from the
// file name after the first dot (e.g. "kitchen.manifest.json" -> ".manifest.json").
import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.resolve(".env"));
loadEnv(path.resolve(".env.local"));
const env = (n) => process.env[n]?.trim() ?? "";

const [storageKey, ...files] = process.argv.slice(2);
if (!storageKey || files.length === 0) {
  console.error("usage: upload-sidecars.mjs <storage_key.spz> <file.json> ...");
  process.exit(2);
}
const bucket = env("R2_BUCKET") || "slate360-storage";
const endpoint =
  env("R2_ENDPOINT") || (env("R2_ACCOUNT_ID") ? `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com` : "");
const s3 = new S3Client({
  region: env("R2_REGION") || "auto",
  endpoint,
  credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  forcePathStyle: true,
});
const base = storageKey.replace(/\.spz$/i, "");
for (const f of files) {
  const name = path.basename(f);
  const suffix = name.slice(name.indexOf("."));
  const key = `${base}${suffix}`;
  const body = fs.readFileSync(f);
  JSON.parse(body.toString("utf8")); // must be valid JSON
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/json" }));
  console.log(`uploaded ${key} (${body.length} bytes)`);
}
