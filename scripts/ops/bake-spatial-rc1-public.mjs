#!/usr/bin/env node
/**
 * Queue a PUBLIC privacy bake for the HouseWalk clip via Modal (master untouched).
 * Callback must be a public origin that has RC1 job-callback code.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const CLIP_ID = "f278d37f-1c2f-4511-aef5-437b3992d39d";
const WT_ID = "7e0575a3-5d55-45d8-807f-9fb959ce2c21";
const callbackBaseUrl = (process.argv[2] || process.env.SITE_URL || "").replace(/\/$/, "");
if (!callbackBaseUrl || callbackBaseUrl.includes("localhost") || callbackBaseUrl.includes("127.0.0.1")) {
  console.error("Pass a public callback origin, e.g. the Vercel preview URL");
  process.exit(1);
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const endpoint = process.env.MODAL_SPATIAL_WALKTHROUGH_ENDPOINT?.trim();
if (!URL || !KEY || !endpoint) {
  console.error("Missing Supabase or MODAL_SPATIAL_WALKTHROUGH_ENDPOINT");
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { persistSession: false } });
const { data: clip, error: clipErr } = await admin
  .from("spatial_clips")
  .select("id, org_id, proxy_key, operator_patch, walkthrough_id")
  .eq("id", CLIP_ID)
  .maybeSingle();
if (clipErr || !clip?.proxy_key) {
  console.error("Ready proxy required");
  process.exit(1);
}
const { data: wt } = await admin.from("spatial_walkthroughs").select("operator_patch").eq("id", WT_ID).maybeSingle();
const operatorPatch = { ...(typeof wt?.operator_patch === "object" && wt.operator_patch ? wt.operator_patch : {}), ...(typeof clip.operator_patch === "object" && clip.operator_patch ? clip.operator_patch : {}) };

const { data: job, error } = await admin.from("spatial_processing_jobs").insert({
  org_id: clip.org_id,
  walkthrough_id: WT_ID,
  clip_id: CLIP_ID,
  job_type: "privacy-bake",
  status: "queued",
  source_s3_key: clip.proxy_key,
  metadata: { mode: "privacy-bake", operatorPatch },
}).select("id").single();
if (error || !job) {
  console.error(error?.message ?? "job insert failed");
  process.exit(1);
}

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jobId: job.id,
    clipId: CLIP_ID,
    orgId: clip.org_id,
    sourceKey: clip.proxy_key,
    mode: "privacy-bake",
    operatorPatch,
    callbackBaseUrl,
  }),
});
console.log(`bake dispatched job=${job.id} modal=${res.status}`);
if (!res.ok) process.exit(1);
