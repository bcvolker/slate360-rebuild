#!/usr/bin/env node
/**
 * Download SPZ from R2, apply conservative splat-transform floater/opacity filters,
 * verify Spark SPZ v3 parse, and overwrite the same key.
 *
 * splat-transform CLI (v2.5.2) flags used:
 *   --filter-nan
 *   --filter-value <name,cmp,value>   (opacity gte 0.05; scale_* lte 0.5)
 *   --filter-floaters                 (default 0.05,0.1,0.004)
 *   --spz-version 3
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

function runSplatTransform(args, label) {
  const proc = spawnSync("npx", ["-y", "@playcanvas/splat-transform", ...args], {
    encoding: "utf8",
    shell: true,
    cwd: process.cwd(),
    timeout: 900_000,
  });
  if (proc.status !== 0) {
    console.error(`[clean-spz] ${label} failed`);
    console.error(proc.stdout);
    console.error(proc.stderr);
    throw new Error(`splat-transform failed (${proc.status})`);
  }
  return proc.stdout ?? "";
}

async function sparkVerify(filePath) {
  const fileBytes = fs.readFileSync(filePath);
  const reader = new SpzReader({ fileBytes });
  await reader.parseHeader();
  if (reader.version !== 3) {
    throw new Error(`Expected SPZ v3, got version ${reader.version}`);
  }
  if (reader.numSplats <= 0) {
    throw new Error("Spark parsed zero splats");
  }
  return { version: reader.version, numSplats: reader.numSplats, shDegree: reader.shDegree };
}

function parseSummaryRowCount(stdout) {
  const match = stdout.match(/\*\*Row Count:\*\*\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const storageKey =
  process.argv[2] ??
  "orgs/c5538bfd-a67a-4930-8481-0e5e331ec7cc/digital-twin/b6b71177-eb1f-4692-ba9d-b1a5ae11e66b/models/001ae3e5-9af5-44e8-87a4-ea6b009f68c6.spz";

const workDir = path.resolve("tmp-spz-clean");
const inputPath = path.join(workDir, "input.spz");
const outputPath = path.join(workDir, "cleaned.spz");

const bucket = process.env.R2_BUCKET || "slate360-storage";
const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");

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

fs.mkdirSync(workDir, { recursive: true });

console.log("[clean-spz] downloading", storageKey);
const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
const inputBytes = Buffer.from(await obj.Body.transformToByteArray());
fs.writeFileSync(inputPath, inputBytes);
console.log("[clean-spz] input file bytes:", inputBytes.length);

const beforeSummary = runSplatTransform([inputPath, "-m", "null"], "before summary");
const beforeCount = parseSummaryRowCount(beforeSummary);
console.log("[clean-spz] before splat count:", beforeCount ?? "unknown");

const filterArgs = [
  "-w",
  inputPath,
  "--filter-nan",
  "--filter-value",
  "opacity,gte,0.05",
  "--filter-value",
  "scale_0,lte,0.5",
  "--filter-value",
  "scale_1,lte,0.5",
  "--filter-value",
  "scale_2,lte,0.5",
  "--filter-floaters",
  outputPath,
  "--spz-version",
  "3",
];

console.log("[clean-spz] applying filters:", filterArgs.join(" "));
runSplatTransform(filterArgs, "clean");

const outputBytes = fs.readFileSync(outputPath);
const afterSummary = runSplatTransform([outputPath, "-m", "null"], "after summary");
const afterCount = parseSummaryRowCount(afterSummary);
console.log("[clean-spz] after splat count:", afterCount ?? "unknown");
console.log("[clean-spz] output file bytes:", outputBytes.length);

const spark = await sparkVerify(outputPath);
console.log("[clean-spz] Spark verify:", spark);

console.log("[clean-spz] uploading to", storageKey);
await s3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: outputBytes,
    ContentType: "application/octet-stream",
  }),
);

console.log(
  JSON.stringify(
    {
      storageKey,
      before: { splatCount: beforeCount, fileBytes: inputBytes.length },
      after: { splatCount: afterCount, fileBytes: outputBytes.length, spark },
      removed: beforeCount && afterCount ? beforeCount - afterCount : null,
    },
    null,
    2,
  ),
);
console.log("[clean-spz] done");
