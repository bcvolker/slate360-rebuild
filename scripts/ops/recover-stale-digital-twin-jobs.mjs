#!/usr/bin/env node

/**
 * Marks Digital Twin processing jobs stuck in "processing" > 45 min as failed.
 *
 * Usage: node scripts/ops/recover-stale-digital-twin-jobs.mjs [staleMinutes]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const staleMinutes = Number(process.argv[2] ?? 45);

  if (!supabaseUrl || !serviceRole) {
    console.log("[recover-dt-stale] SKIPPED: missing Supabase credentials");
    process.exit(0);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("recover_stale_digital_twin_processing_jobs", {
    p_stale_minutes: staleMinutes,
  });

  if (error) {
    console.error("[recover-dt-stale] FAIL:", error.message);
    process.exit(1);
  }

  console.log(`[recover-dt-stale] Recovered ${data ?? 0} stale job(s) (threshold=${staleMinutes}m)`);
}

main().catch((err) => {
  console.error("[recover-dt-stale] Unexpected:", err);
  process.exit(1);
});
