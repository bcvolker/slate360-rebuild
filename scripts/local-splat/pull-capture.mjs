// Pull every uploaded asset of a Twin 360 capture from R2 into a local folder so the
// desktop Capture Studio can build it. Filenames keep the phone's names (twin_photo_N.jpg,
// lidar_capture.ply.gz, lidar_poses.json.gz, lidar_depth.s360depth, capture_bundle.json).
// usage: node scripts/local-splat/pull-capture.mjs <captureId> <outDir> [--include-uploading]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    if (!k || process.env[k]) continue;
    process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.resolve(".env"));
loadEnv(path.resolve(".env.local"));
const env = (n) => process.env[n]?.trim() ?? "";

const [captureId, outDir] = process.argv.slice(2);
if (!captureId || !outDir) {
  console.error("usage: pull-capture.mjs <captureId> <outDir> [--include-uploading]");
  process.exit(2);
}
const includeUploading = process.argv.includes("--include-uploading");
fs.mkdirSync(outDir, { recursive: true });

const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const s3 = new S3Client({
  region: env("R2_REGION") || "auto",
  endpoint:
    env("R2_ENDPOINT") || (env("R2_ACCOUNT_ID") ? `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com` : ""),
  credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  forcePathStyle: true,
});
const bucket = env("R2_BUCKET") || "slate360-storage";

const { data: capture, error: capErr } = await sb
  .from("digital_twin_captures")
  .select("id, title, space_id, project_id, org_id, capture_status")
  .eq("id", captureId)
  .maybeSingle();
if (capErr || !capture) {
  console.error("capture not found", capErr?.message ?? "");
  process.exit(1);
}
const { data: assets } = await sb
  .from("digital_twin_capture_assets")
  .select("asset_kind, status, storage_key, file_size_bytes, content_type")
  .eq("capture_id", captureId)
  .is("deleted_at", null)
  .order("sort_order")
  .limit(2000);

const ready = (assets ?? []).filter((a) => a.storage_key && (a.status === "ready" || includeUploading));
const pending = (assets ?? []).filter((a) => !a.storage_key || a.status !== "ready");
console.log(`capture ${capture.id} "${capture.title}" space ${capture.space_id} status ${capture.capture_status}`);
console.log(`assets: ${assets?.length ?? 0} total, ${ready.length} downloadable, ${pending.length} still uploading`);

const counts = {};
let bytes = 0;
for (const a of ready) {
  const raw = a.storage_key.split("/").pop();
  // Strip the uploader's timestamp prefix (1788925928266_twin_photo_20.jpg → twin_photo_20.jpg).
  const name = raw.replace(/^\d{10,}_/, "");
  const dest = path.join(outDir, name.replace(/\.gz$/, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !name.endsWith(".gz")) {
    counts[a.asset_kind] = (counts[a.asset_kind] || 0) + 1;
    continue;
  }
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: a.storage_key }));
  let buf = Buffer.from(await res.Body.transformToByteArray());
  if (name.endsWith(".gz")) buf = zlib.gunzipSync(buf);
  fs.writeFileSync(dest, buf);
  bytes += buf.length;
  counts[a.asset_kind] = (counts[a.asset_kind] || 0) + 1;
}
fs.writeFileSync(
  path.join(outDir, "capture.json"),
  JSON.stringify({ capture, downloaded: counts, pending: pending.length, pulledAt: new Date().toISOString() }, null, 2),
);
console.log(`downloaded ${(bytes / 1e6).toFixed(1)} MB:`, JSON.stringify(counts));
if (pending.length) console.log(`NOTE ${pending.length} assets still uploading — run again later for the rest.`);
