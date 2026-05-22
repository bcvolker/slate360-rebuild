#!/usr/bin/env node
/**
 * Verify Capture V2 schema on remote Supabase (read-only checks).
 * Usage: node scripts/ops/verify-capture-v2-schema.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (val) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const checks = [];

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return true;
  if (error.message?.includes(column) || error.code === "42703") return false;
  throw new Error(`${table}.${column}: ${error.message}`);
}

async function rpcNearby() {
  const { error } = await admin.rpc("get_nearby_photos", {
    p_lat: 33.45,
    p_lng: -112.07,
    p_radius_meters: 100,
    p_org_id: "00000000-0000-0000-0000-000000000001",
    p_project_id: null,
    p_session_id: null,
  });
  if (!error) return { ok: true, detail: "6-arg RPC callable" };
  if (error.message?.includes("Could not find the function")) {
    return { ok: false, detail: "get_nearby_photos missing or wrong signature" };
  }
  return { ok: true, detail: `RPC exists (${error.message})` };
}

async function tableExists(table) {
  const { error } = await admin.from(table).select("id").limit(1);
  if (!error) return true;
  if (error.message?.includes("does not exist") || error.code === "42P01") return false;
  return true;
}

console.log("Capture V2 schema verification\n");

checks.push(["site_walk_items.deleted_at", await columnExists("site_walk_items", "deleted_at")]);
checks.push(["site_walk_items.retry_count", await columnExists("site_walk_items", "retry_count")]);
checks.push(["site_walk_sessions.capture_v2_version", await columnExists("site_walk_sessions", "capture_v2_version")]);
checks.push(["site_walk_deliverables.async_job_status", await columnExists("site_walk_deliverables", "async_job_status")]);
checks.push(["site_walk_scene_contexts table", await tableExists("site_walk_scene_contexts")]);
checks.push(["site_walk_copilot_sessions table", await tableExists("site_walk_copilot_sessions")]);

const rpc = await rpcNearby();
checks.push(["get_nearby_photos RPC", rpc.ok]);

let failed = 0;
for (const [name, ok] of checks) {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed += 1;
  console.log(`  [${mark}] ${name}`);
}
if (!rpc.ok) console.log(`         ${rpc.detail}`);
else console.log(`         ${rpc.detail}`);

if (failed > 0) {
  console.log(`\n${failed} check(s) failed. Run: node scripts/ops/run-capture-v2-migrations.mjs`);
  process.exit(1);
}

console.log("\nAll Capture V2 schema checks passed.");
