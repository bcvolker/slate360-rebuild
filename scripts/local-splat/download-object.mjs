// Download an R2 object to a local file (backup before replacing a published model).
// usage: node scripts/local-splat/download-object.mjs <storage_key> <out_file>
import fs from "node:fs";
import path from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
const [key, out] = process.argv.slice(2);
if (!key || !out) {
  console.error("usage: download-object.mjs <storage_key> <out_file>");
  process.exit(2);
}
const endpoint =
  env("R2_ENDPOINT") || (env("R2_ACCOUNT_ID") ? `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com` : "");
const s3 = new S3Client({
  region: env("R2_REGION") || "auto",
  endpoint,
  credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  forcePathStyle: true,
});
const res = await s3.send(new GetObjectCommand({ Bucket: env("R2_BUCKET") || "slate360-storage", Key: key }));
const bytes = Buffer.from(await res.Body.transformToByteArray());
fs.writeFileSync(out, bytes);
console.log(`downloaded ${key} -> ${out} (${bytes.length} bytes)`);
