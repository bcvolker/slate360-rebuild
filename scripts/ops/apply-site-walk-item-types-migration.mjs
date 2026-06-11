#!/usr/bin/env node
/**
 * Apply approved migration: site_walk_items item_type photo_360 + file_attachment.
 * Usage: node scripts/ops/apply-site-walk-item-types-migration.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const PROJECT_REF = "hadnfcenpcfaeclczsmm";
const MIGRATION_FILE =
  "supabase/migrations/20260609120000_site_walk_item_types_photo360_file_attachment.sql";
const MIGRATION_VERSION = "20260609120000";
const MIGRATION_NAME = "site_walk_item_types_photo360_file_attachment";
const API_BASE = process.env.SMOKE_BASE_URL || "https://www.slate360.ai";

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

async function runSql(query) {
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`SQL failed HTTP ${resp.status}: ${text.slice(0, 600)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

loadEnvLocal();

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log("=== 1) Apply migration SQL ===\n");
const migrationSql = readFileSync(resolve(process.cwd(), MIGRATION_FILE), "utf8");
await runSql(migrationSql);
console.log(`OK ${MIGRATION_FILE}\n`);

console.log("=== 2) Verify CHECK constraint definition ===\n");
const constraintRows = await runSql(`
SELECT pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'site_walk_items'
  AND c.conname = 'site_walk_items_item_type_check';
`);
console.log(JSON.stringify(constraintRows, null, 2));

const definition = JSON.stringify(constraintRows);
if (!definition.includes("photo_360") || !definition.includes("file_attachment")) {
  console.error("\nConstraint missing photo_360 or file_attachment");
  process.exit(1);
}
console.log("\nConstraint includes photo_360 and file_attachment.\n");

console.log("=== 3) Record in supabase_migrations.schema_migrations ===\n");
const schemaMigrationRows = await runSql(`
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '${MIGRATION_VERSION}',
  '${MIGRATION_NAME}',
  ARRAY[${migrationSql
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("--"))
    .map((line) => `'${line.replace(/'/g, "''")}'`)
    .join(",")}]::text[]
)
ON CONFLICT (version) DO NOTHING
RETURNING version, name;
`);
console.log(JSON.stringify(schemaMigrationRows, null, 2));

console.log("\n=== 4) Smoke-test POST /api/site-walk/items (production) ===\n");

async function resolveTestContext() {
  const { data: session, error: sessionError } = await admin
    .from("site_walk_sessions")
    .select("id, org_id, project_id, created_by")
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) throw new Error("No in_progress site_walk_sessions found for smoke test");

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: (
      await admin.auth.admin.getUserById(session.created_by)
    ).data.user?.email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message || "Could not generate auth link for session owner");
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const verifyResp = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    }),
  });
  const verifyJson = await verifyResp.json();
  if (!verifyResp.ok || !verifyJson.access_token) {
    throw new Error(`Auth verify failed: ${JSON.stringify(verifyJson).slice(0, 400)}`);
  }

  return { session, accessToken: verifyJson.access_token };
}

const { session, accessToken } = await resolveTestContext();
console.log(`Using session ${session.id} (org ${session.org_id})\n`);

async function postItem(itemType) {
  const clientItemId = randomUUID();
  const body = {
    session_id: session.id,
    item_type: itemType,
    title: `smoke-${itemType}-${Date.now()}`,
    client_item_id: clientItemId,
    metadata: { smoke_test: true, item_type: itemType },
  };

  const resp = await fetch(`${API_BASE}/api/site-walk/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: resp.status, body: json, clientItemId };
}

const results = [];
for (const itemType of ["photo_360", "file_attachment"]) {
  const result = await postItem(itemType);
  results.push({ itemType, ...result });
  console.log(`POST photo_360/file_attachment → ${itemType}`);
  console.log(`  HTTP ${result.status}`);
  console.log(`  ${JSON.stringify(result.body, null, 2)}\n`);

  if (result.status >= 400) {
    console.error(`Smoke test failed for ${itemType}`);
    process.exit(1);
  }

  const itemId = result.body?.item?.id ?? result.body?.data?.item?.id;
  if (itemId) {
    await admin.from("site_walk_items").delete().eq("id", itemId);
    console.log(`  Cleaned up smoke item ${itemId}\n`);
  }
}

console.log("=== Summary ===");
console.log(JSON.stringify({ constraintRows, schemaMigrationRows, apiResults: results }, null, 2));
console.log("\nMigration applied and smoke tests passed.");
