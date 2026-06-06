#!/usr/bin/env node

/**
 * Smoke test: Digital Twin share create → claim → revoke → max_views.
 *
 * Usage:
 *   node scripts/ops/smoke-digital-twin-share.mjs
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

function getEnv(name) {
  return process.env[name]?.trim() ?? "";
}

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ceoEmail = getEnv("CEO_EMAIL");

  if (!supabaseUrl || !serviceRole) {
    console.log("[smoke-dt-share] SKIPPED: missing Supabase credentials");
    process.exit(0);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, org_id, title")
    .eq("title", "Demo Splat Twin")
    .is("deleted_at", null)
    .maybeSingle();

  if (!space?.id) {
    console.error("[smoke-dt-share] Demo space missing — run seed-digital-twin-demo-model.mjs first");
    process.exit(1);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", ceoEmail)
    .maybeSingle();

  if (!profile?.id) {
    console.error("[smoke-dt-share] CEO profile not found");
    process.exit(1);
  }

  const token = `smoke_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const { error: insertError } = await admin.from("digital_twin_share_tokens").insert({
    token,
    org_id: space.org_id,
    space_id: space.id,
    created_by: profile.id,
    role: "view",
    label: "Smoke test",
    max_views: 1,
    is_revoked: false,
  });

  if (insertError) {
    console.error("[smoke-dt-share] insert failed:", insertError.message);
    process.exit(1);
  }

  const claim = async () =>
    admin.rpc("claim_digital_twin_share_view", {
      p_token: token,
      p_viewer_ip: "127.0.0.1",
      p_viewer_ua: "smoke-digital-twin-share",
    });

  const first = await claim();
  if (first.error || !first.data?.length) {
    console.error("[smoke-dt-share] first claim failed");
    process.exit(1);
  }

  const second = await claim();
  if (!second.error && second.data?.length) {
    console.error("[smoke-dt-share] max_views not enforced");
    process.exit(1);
  }

  await admin.from("digital_twin_share_tokens").update({ is_revoked: true }).eq("token", token);

  const revoked = await claim();
  if (!revoked.error && revoked.data?.length) {
    console.error("[smoke-dt-share] revoke not enforced");
    process.exit(1);
  }

  console.log("[smoke-dt-share] PASS");
  console.log(`  share_url: ${getEnv("NEXT_PUBLIC_APP_URL") || "https://slate360.ai"}/share/twin/${token} (revoked after test)`);
}

main().catch((error) => {
  console.error("[smoke-dt-share] Fatal:", error);
  process.exit(1);
});
