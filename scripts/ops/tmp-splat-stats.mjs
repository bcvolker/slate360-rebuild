#!/usr/bin/env node
/** TEMP: compare two models' geometry health (anisotropy + extent + hull-ish).
 * Prototype for the VALID-1 gate. Delete after AOB205 delivery. */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

function loadEnv(f) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const i = l.indexOf("=");
    if (i > 0 && !process.env[l.slice(0, i).trim()])
      process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({ region: "auto", endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });

const MODELS = { stills: "b85f4732-0643-4e08-abda-347fd48ef02d", video: "2b458ef1-7145-4b0a-b252-47811c1c8003" };
const tmp = "scripts/ops/.splatstats";
fs.mkdirSync(tmp, { recursive: true });

for (const [label, id] of Object.entries(MODELS)) {
  const { data } = await supabase.from("digital_twin_models").select("storage_key").eq("id", id).single();
  const spz = `${tmp}/${label}.spz`, ply = `${tmp}/${label}.ply`;
  if (!fs.existsSync(ply)) {
    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: data.storage_key }));
    fs.writeFileSync(spz, Buffer.from(await obj.Body.transformToByteArray()));
    execSync(`npx -y @playcanvas/splat-transform@2.7.1 -w "${spz}" "${ply}"`, { stdio: "pipe" });
  }
  console.log(`${label}: ${(fs.statSync(ply).size / 1048576).toFixed(1)} MB ply`);
}
console.log("PLYs ready in", tmp);
