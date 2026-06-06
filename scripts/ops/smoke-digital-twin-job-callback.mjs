#!/usr/bin/env node

/**
 * Smoke: Digital Twin worker callback HMAC + completion/failure handling.
 *
 * Usage: node scripts/ops/smoke-digital-twin-job-callback.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function getEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function runCallbackSmoke() {
  const result = spawnSync(
    "npx",
    ["--yes", "tsx", "scripts/ops/smoke-digital-twin-job-callback-runner.ts"],
    { stdio: "inherit", shell: true, cwd: process.cwd() },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const workerSecret = getEnv("GPU_WORKER_SECRET_KEY") || "smoke-worker-secret";

  if (!supabaseUrl || !serviceRole) {
    console.log("[smoke-dt-callback] SKIPPED: missing Supabase credentials");
    process.exit(0);
  }

  process.env.GPU_WORKER_SECRET_KEY = workerSecret;

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org } = await admin.from("organizations").select("id, credits_balance").limit(1).single();
  if (!org?.id) {
    console.error("[smoke-dt-callback] No organization found");
    process.exit(1);
  }

  await admin
    .from("organizations")
    .update({ credits_balance: Math.max(org.credits_balance ?? 0, 500) })
    .eq("id", org.id);

  runCallbackSmoke();
  console.log("\n[smoke-dt-callback] PASS");
}

main().catch((err) => {
  console.error("[smoke-dt-callback] Unexpected:", err);
  process.exit(1);
});
