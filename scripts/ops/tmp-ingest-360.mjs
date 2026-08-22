#!/usr/bin/env node
/** TEMP: ingest a folder of 360 .insv files as one capture. Delete when done.
 * Usage: node scripts/ops/tmp-ingest-360.mjs "<folder>" "<space title>" */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

function loadEnv(f) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const i = l.indexOf("=");
    if (i > 0 && !process.env[l.slice(0, i).trim()])
      process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const SRC = process.argv[2];
const TITLE = process.argv[3] || path.basename(SRC);
const ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const USER = "f73fd954-d8dd-425f-bb93-0ce92cb65088";
const PROJECT = "f3f23c68-5510-4f78-ae12-3ea978340f6a";
const STATE = "scripts/ops/.ingest360-state.json";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({ region: "auto", endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });

const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 2));

if (!st.spaceId) {
  const { data, error } = await supabase.from("digital_twin_spaces")
    .insert({ org_id: ORG, project_id: PROJECT, created_by: USER, title: TITLE, status: "processing" })
    .select("id").single();
  if (error) throw error;
  st.spaceId = data.id; save();
  console.log("space", st.spaceId);
}
if (!st.captureId) {
  const { data, error } = await supabase.from("digital_twin_captures")
    .insert({ org_id: ORG, space_id: st.spaceId, project_id: PROJECT, created_by: USER,
              device_class: "other", has_lidar: false, capture_status: "uploading", title: TITLE })
    .select("id").single();
  if (error) throw error;
  st.captureId = data.id; save();
  console.log("capture", st.captureId);
}

st.done = st.done || {};
const files = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".insv")).sort();
console.log(`${files.length} .insv files`);

for (const name of files) {
  if (st.done[name]) { console.log("  skip", name); continue; }
  const full = path.join(SRC, name);
  const size = fs.statSync(full).size;
  const key = `orgs/${ORG}/digital-twin/${st.spaceId}/${st.captureId}/${Date.now()}_${name}`;
  const t0 = Date.now();
  const up = new Upload({
    client: s3,
    params: { Bucket: process.env.R2_BUCKET, Key: key, Body: fs.createReadStream(full), ContentType: "video/mp4" },
    queueSize: 4, partSize: 16 * 1024 * 1024,
  });
  let last = 0;
  up.on("httpUploadProgress", (p) => {
    const pct = Math.round((p.loaded / size) * 100);
    if (pct >= last + 25) { last = pct; console.log(`    ${name} ${pct}%`); }
  });
  await up.done();
  const { error } = await supabase.from("digital_twin_capture_assets").insert({
    org_id: ORG, space_id: st.spaceId, capture_id: st.captureId,
    asset_kind: "panorama_360", storage_key: key, file_size_bytes: size,
    status: "ready", content_type: "video/mp4",
  });
  if (error) throw error;
  st.done[name] = key; save();
  console.log(`  ok ${name} (${(size / 1048576).toFixed(0)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await supabase.from("digital_twin_captures")
  .update({ capture_status: "ready", uploaded_at: new Date().toISOString() })
  .eq("id", st.captureId);
console.log(`DONE space=${st.spaceId} capture=${st.captureId}`);
