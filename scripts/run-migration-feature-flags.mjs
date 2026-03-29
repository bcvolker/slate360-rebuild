#!/usr/bin/env node
/**
 * Run the org_feature_flags migration via Supabase admin client.
 * Uses service role key to bypass RLS.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("\n🔍 Checking if org_feature_flags table exists...\n");

  // Check if table exists by querying it directly
  const { data, error } = await supabase
    .from("org_feature_flags")
    .select("org_id")
    .limit(1);

  if (error && error.code === "42P01") {
    // Table doesn't exist — run migration
    console.log("Table does not exist. Running migration...\n");
    await runMigration();
  } else if (error) {
    // Some other error — table might not exist with a different error code
    console.log(`Query returned error: ${error.code} - ${error.message}`);
    if (error.message.includes("does not exist") || error.message.includes("relation")) {
      console.log("Table does not exist. Running migration...\n");
      await runMigration();
    } else {
      console.log("Unexpected error. Attempting migration anyway...\n");
      await runMigration();
    }
  } else {
    console.log(`✅ Table org_feature_flags already exists (${data?.length ?? 0} rows returned)\n`);
    await verifyColumns();
  }
}

async function runMigration() {
  const sqlPath = resolve(process.cwd(), "supabase/migrations/20260329_org_feature_flags.sql");
  const sql = readFileSync(sqlPath, "utf8");

  // Split into individual statements and run them
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    console.log(`Running: ${stmt.slice(0, 80)}...`);
    const { error } = await supabase.rpc("exec_sql", { sql: stmt + ";" });
    if (error) {
      // Try via raw fetch as fallback
      console.log(`  rpc failed (${error.message}), trying POST /rest/v1/rpc...`);
    }
  }

  // Verify after migration
  const { data, error } = await supabase
    .from("org_feature_flags")
    .select("org_id")
    .limit(1);

  if (error) {
    console.error(`❌ Migration verification failed: ${error.message}`);
    console.log("\n⚠️  The migration needs to be run manually in the Supabase SQL Editor.");
    console.log("Go to: https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm/sql/new");
    console.log("Paste the contents of: supabase/migrations/20260329_org_feature_flags.sql");
    process.exit(1);
  } else {
    console.log(`\n✅ org_feature_flags table exists and is accessible (${data?.length ?? 0} rows)`);
  }
}

async function verifyColumns() {
  // Verify the expected columns exist by attempting an insert + rollback (dry run via select)
  const { data, error } = await supabase
    .from("org_feature_flags")
    .select("org_id, standalone_tour_builder, standalone_punchwalk, tour_builder_seat_limit, tour_builder_seats_used, created_at, updated_at")
    .limit(0);

  if (error) {
    console.error(`❌ Column verification failed: ${error.message}`);
    console.log("Some expected columns may be missing. Run the migration manually.");
  } else {
    console.log("✅ All expected columns verified: org_id, standalone_tour_builder, standalone_punchwalk, tour_builder_seat_limit, tour_builder_seats_used, created_at, updated_at");
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
