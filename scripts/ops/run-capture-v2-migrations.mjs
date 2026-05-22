#!/usr/bin/env node
/**
 * Apply Capture V2 migrations in order via Supabase Management API.
 * Usage: node scripts/ops/run-capture-v2-migrations.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PROJECT_REF = "hadnfcenpcfaeclczsmm";
const MIGRATIONS = [
  "supabase/migrations/20260521000000_site_walk_capture_v2_foundation.sql",
  "supabase/migrations/20260521000101_site_walk_active_items_nearby.sql",
  "supabase/migrations/20260521000100_site_walk_capture_v2_phase2.sql",
];

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

async function runSql(file) {
  const sql = readFileSync(resolve(process.cwd(), file), "utf8");
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`${file}: HTTP ${resp.status} ${text.slice(0, 400)}`);
  }
  return text;
}

loadEnvLocal();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

for (const file of MIGRATIONS) {
  console.log(`Running ${file}...`);
  try {
    await runSql(file);
    console.log(`OK ${file}`);
  } catch (err) {
    console.error(String(err));
    console.error("\nStopped. Fix token (SUPABASE_ACCESS_TOKEN) or run SQL manually in Supabase Dashboard.");
    console.error("Then verify: node scripts/ops/verify-capture-v2-schema.mjs");
    process.exit(1);
  }
}

console.log("\nAll Capture V2 migrations applied.");
console.log("Verify: node scripts/ops/verify-capture-v2-schema.mjs");
