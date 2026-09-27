#!/usr/bin/env node
/**
 * Copy the golden Room 213 PLY from the PRIVATE storage bucket to the dedicated PUBLIC previews bucket under its
 * content-hashed name, verifying sha256 in-stream. Nothing else is copied; the private bucket is only read.
 *
 * Reads (private, existing):  R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Writes (public, bucket-scoped Object Read & Write token):
 *   PUBLIC_PREVIEWS_R2_ENDPOINT, PUBLIC_PREVIEWS_R2_ACCESS_KEY_ID, PUBLIC_PREVIEWS_R2_SECRET_ACCESS_KEY,
 *   PUBLIC_PREVIEWS_R2_BUCKET (= slate360-public-previews)
 *
 * Usage: node scripts/ops/room213-publish-public-model.mjs [path/to/.env.local]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const GOLDEN_SHA256 = "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62";
const GOLDEN_BYTES = 247_032_347;
const SOURCE_KEY = "experimental/spirula-hardened/detail-diag-2026-09-25/models/golden/splat.ply";
const TARGET_KEY = `room213/golden-${GOLDEN_SHA256.slice(0, 16)}.ply`;

const envFile = process.argv[2] ?? ".env.local";
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const need = (k) => {
  if (!env[k]) throw new Error(`missing ${k} in ${envFile}`);
  return env[k];
};
const client = (p) =>
  new S3Client({ region: "auto", endpoint: need(`${p}ENDPOINT`), credentials: { accessKeyId: need(`${p}ACCESS_KEY_ID`), secretAccessKey: need(`${p}SECRET_ACCESS_KEY`) } });

const src = client("R2_");
const dst = client("PUBLIC_PREVIEWS_R2_");
const dstBucket = need("PUBLIC_PREVIEWS_R2_BUCKET");
if (dstBucket === env.R2_BUCKET) throw new Error("refusing: public bucket must not be the private storage bucket");

const existing = await dst.send(new HeadObjectCommand({ Bucket: dstBucket, Key: TARGET_KEY })).catch(() => null);
if (existing?.ContentLength === GOLDEN_BYTES && existing.Metadata?.sha256 === GOLDEN_SHA256) {
  console.log(`already published: ${TARGET_KEY}`);
  process.exit(0);
}

const obj = await src.send(new GetObjectCommand({ Bucket: need("R2_BUCKET"), Key: SOURCE_KEY }));
const hash = createHash("sha256");
const body = new PassThrough();
let bytes = 0;
obj.Body.on("data", (c) => {
  hash.update(c);
  bytes += c.length;
});
obj.Body.pipe(body);

const upload = new Upload({
  client: dst,
  params: {
    Bucket: dstBucket,
    Key: TARGET_KEY,
    Body: body,
    ContentType: "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: { sha256: GOLDEN_SHA256, source: "room213-golden-spirula-3dgut" },
  },
  partSize: 16 * 1024 * 1024,
  queueSize: 4,
});
upload.on("httpUploadProgress", (p) => process.stdout.write(`\r${Math.round((p.loaded / GOLDEN_BYTES) * 100)}%   `));
await upload.done();
const digest = hash.digest("hex");
if (digest !== GOLDEN_SHA256 || bytes !== GOLDEN_BYTES) {
  await dst.send(new DeleteObjectCommand({ Bucket: dstBucket, Key: TARGET_KEY }));
  throw new Error(`integrity mismatch (sha ${digest}, ${bytes} bytes) — public object deleted`);
}
console.log(`\npublished ${TARGET_KEY} (${bytes} bytes, sha256 verified)`);
