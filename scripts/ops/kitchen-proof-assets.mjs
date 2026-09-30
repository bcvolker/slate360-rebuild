/**
 * Download metric GLB/QA from R2, convert Route B V1 Gaussian to SPZ,
 * upload appearance-x4-v1.spz next to the metric job. Does not retrain.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const SPACE = "e4eaf78b-b064-4cce-b640-8bc8efb820e1";
const JOB = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const PREFIX = `orgs/${ORG}/digital-twin/${SPACE}/models/${JOB}`;
const RAW_PLY =
  "C:/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T16-46-route-b-x4-independent/x4_gaussian_raw.ply";

const workDir = path.resolve("tmp/kitchen-proof");
fs.mkdirSync(workDir, { recursive: true });

const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");
const bucket = process.env.R2_BUCKET || "slate360-storage";
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !endpoint) {
  throw new Error("R2 credentials missing in .env.local");
}

const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function download(key, dest) {
  const t0 = Date.now();
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from(await obj.Body.transformToByteArray());
  fs.writeFileSync(dest, bytes);
  return { key, bytes: bytes.length, ms: Date.now() - t0, dest };
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function convertSpz(rawPly, dest) {
  const proc = spawnSync(
    "npx",
    ["-y", "@playcanvas/splat-transform", "-w", rawPly, "--filter-nan", dest, "--spz-version", "3"],
    { encoding: "utf8", shell: true, cwd: process.cwd(), timeout: 180_000 },
  );
  if (proc.status !== 0) {
    console.error(proc.stdout);
    console.error(proc.stderr);
    throw new Error(`splat-transform failed (${proc.status})`);
  }
  return dest;
}

const glbDest = path.join(workDir, "geometry.glb");
const qaDest = path.join(workDir, "qa.json");
const spzDest = path.join(workDir, "appearance-x4-v1.spz");

const glb = await download(`${PREFIX}/geometry.glb`, glbDest);
console.log("[kitchen-proof] glb", glb);
try {
  const qa = await download(`${PREFIX}/qa.json`, qaDest);
  console.log("[kitchen-proof] qa", qa);
} catch (err) {
  console.warn("[kitchen-proof] qa.json missing", String(err));
}

if (!fs.existsSync(RAW_PLY)) throw new Error(`V1 raw ply missing: ${RAW_PLY}`);
console.log("[kitchen-proof] converting V1 raw ply → SPZ");
convertSpz(RAW_PLY, spzDest);
const spzBytes = fs.statSync(spzDest).size;
console.log("[kitchen-proof] spz bytes", spzBytes);

const spzKey = `${PREFIX}/appearance-x4-v1.spz`;
if (!(await exists(spzKey))) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: spzKey,
      Body: fs.readFileSync(spzDest),
      ContentType: "application/octet-stream",
    }),
  );
  console.log("[kitchen-proof] uploaded", spzKey);
} else {
  console.log("[kitchen-proof] already on R2", spzKey);
}

console.log(JSON.stringify({ glb, spzBytes, spzKey }, null, 2));
