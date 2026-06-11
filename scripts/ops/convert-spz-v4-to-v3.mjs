#!/usr/bin/env node
/** One-off: download v4 SPZ from R2, convert to v3, re-upload same key. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const STORAGE_KEY =
  "orgs/c5538bfd-a67a-4930-8481-0e5e331ec7cc/digital-twin/b6b71177-eb1f-4692-ba9d-b1a5ae11e66b/models/001ae3e5-9af5-44e8-87a4-ea6b009f68c6.spz";
const WORK = path.resolve("tmp-spz-v3-convert");
const INPUT = path.join(WORK, "input.spz");
const OUTPUT = path.join(WORK, "output.spz");

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

fs.mkdirSync(WORK, { recursive: true });

console.log("[convert] downloading", STORAGE_KEY);
const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: STORAGE_KEY }));
const inputBytes = Buffer.from(await obj.Body.transformToByteArray());
fs.writeFileSync(INPUT, inputBytes);
console.log("[convert] input bytes:", inputBytes.length, "magic:", inputBytes.subarray(0, 4).toString("hex"));

console.log("[convert] running splat-transform → v3");
const proc = spawnSync(
  "npx",
  ["-y", "@playcanvas/splat-transform", INPUT, OUTPUT, "--spz-version", "3"],
  { encoding: "utf8", shell: true, cwd: process.cwd(), timeout: 600_000 },
);
if (proc.status !== 0) {
  console.error(proc.stdout);
  console.error(proc.stderr);
  throw new Error(`splat-transform failed (${proc.status})`);
}

const outBytes = fs.readFileSync(OUTPUT);
const magic = outBytes.subarray(0, 2);
console.log("[convert] output bytes:", outBytes.length);
console.log("[convert] magic hex:", outBytes.subarray(0, 8).toString("hex"));
console.log("[convert] gzip?", magic[0] === 0x1f && magic[1] === 0x8b);
if (magic[0] !== 0x1f || magic[1] !== 0x8b) {
  throw new Error("Output is not gzip SPZ v3");
}

console.log("[convert] uploading to", STORAGE_KEY);
await s3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: STORAGE_KEY,
    Body: outBytes,
    ContentType: "application/octet-stream",
  }),
);

console.log("[convert] done");
