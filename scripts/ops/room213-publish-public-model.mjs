#!/usr/bin/env node
/**
 * Copy the Room 213 model files from the PRIVATE storage bucket to the dedicated PUBLIC previews bucket under their
 * content-hashed names, verifying sha256 in-stream (a mismatch deletes the public object). Only these pinned files
 * are copied; the private bucket is only read. Never prints credentials.
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

const DIAG = "experimental/spirula-hardened/detail-diag-2026-09-25/models";
const FILES = [
  { source: `${DIAG}/golden/splat.ply`, sha256: "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62", bytes: 247_032_347, name: "golden" },
  { source: `${DIAG}/presentation-v1/room213-pres-v1.ply`, sha256: "4b93f88d6796cab045d351fc91e619ac4980b4f2c9e837896d9c3e81c3bb0aef", bytes: 237_441_195, name: "pres-v1" },
  { source: `${DIAG}/presentation-v1/room213-pres-v1-perimeter.ply`, sha256: "b43da6b5c43ddde6596edd78b99c8fd97601c3eb231e2e6db00c8fe49d4a033f", bytes: 723_209, name: "pres-v1-perimeter" },
].map((f) => ({ ...f, target: `room213/${f.name}-${f.sha256.slice(0, 16)}.ply` }));

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
  if (!env[k] || env[k].includes("PASTE_")) throw new Error(`missing ${k} in ${envFile}`);
  return env[k];
};
const client = (p) =>
  new S3Client({ region: "auto", endpoint: need(`${p}ENDPOINT`), credentials: { accessKeyId: need(`${p}ACCESS_KEY_ID`), secretAccessKey: need(`${p}SECRET_ACCESS_KEY`) } });

const src = client("R2_");
const dst = client("PUBLIC_PREVIEWS_R2_");
const dstBucket = need("PUBLIC_PREVIEWS_R2_BUCKET");
if (dstBucket === env.R2_BUCKET) throw new Error("refusing: public bucket must not be the private storage bucket");

for (const f of FILES) {
  const existing = await dst.send(new HeadObjectCommand({ Bucket: dstBucket, Key: f.target })).catch(() => null);
  if (existing?.ContentLength === f.bytes && existing.Metadata?.sha256 === f.sha256) {
    console.log(`already published: ${f.target}`);
    continue;
  }
  const obj = await src.send(new GetObjectCommand({ Bucket: need("R2_BUCKET"), Key: f.source }));
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
      Key: f.target,
      Body: body,
      ContentType: "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { sha256: f.sha256, source: "room213-spirula-3dgut" },
    },
    partSize: 16 * 1024 * 1024,
    queueSize: 4,
  });
  await upload.done();
  const digest = hash.digest("hex");
  if (digest !== f.sha256 || bytes !== f.bytes) {
    await dst.send(new DeleteObjectCommand({ Bucket: dstBucket, Key: f.target }));
    throw new Error(`integrity mismatch for ${f.target} (${bytes} bytes) — public object deleted`);
  }
  console.log(`published ${f.target} (${bytes} bytes, sha256 verified)`);
}
