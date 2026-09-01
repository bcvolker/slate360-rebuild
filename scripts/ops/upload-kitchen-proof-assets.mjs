/**
 * Upload kitchen-proof display derivatives to the metric job prefix.
 */
import fs from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

const PREFIX =
  "orgs/c5538bfd-a67a-4930-8481-0e5e331ec7cc/digital-twin/e4eaf78b-b064-4cce-b640-8bc8efb820e1/models/79a4f0ac-32e9-4358-bda0-e1a7461510e1";
const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");
const bucket = process.env.R2_BUCKET || "slate360-storage";
const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const files = [
  { local: "tmp/kitchen-proof/products/geometry.glb", key: `${PREFIX}/geometry.glb`, type: "model/gltf-binary" },
  { local: "tmp/kitchen-proof/products/geometry-measurement.glb", key: `${PREFIX}/geometry-measurement.glb`, type: "model/gltf-binary" },
  { local: "tmp/kitchen-proof/products/geometry-display.glb", key: `${PREFIX}/geometry-display.glb`, type: "model/gltf-binary" },
  { local: "tmp/kitchen-proof/products/geometry-nav.glb", key: `${PREFIX}/geometry-nav.glb`, type: "model/gltf-binary" },
];

for (const file of files) {
  if (!fs.existsSync(file.local)) {
    console.warn("skip missing", file.local);
    continue;
  }
  const body = fs.readFileSync(file.local);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: file.key,
      Body: body,
      ContentType: file.type,
    }),
  );
  console.log("uploaded", file.key, body.length);
}
