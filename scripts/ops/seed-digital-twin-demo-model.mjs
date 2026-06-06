#!/usr/bin/env node

/**
 * Seeds a CEO-org demo Digital Twin space + primary .spz model for viewer/share smoke tests.
 *
 * Usage:
 *   node scripts/ops/seed-digital-twin-demo-model.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEMO_SPACE_TITLE = "Demo Splat Twin";
const DEMO_MODEL_TITLE = "Butterfly Sample (.spz)";
const SAMPLE_SPZ_URL = "https://sparkjs.dev/assets/splats/butterfly.spz";

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
    console.error("[seed-dt-demo] Missing Supabase credentials");
    process.exit(1);
  }

  if (!ceoEmail) {
    console.error("[seed-dt-demo] CEO_EMAIL is required to target the CEO org");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", ceoEmail)
    .maybeSingle();

  if (profileError || !profile?.id) {
    console.error("[seed-dt-demo] CEO profile not found:", profileError?.message ?? ceoEmail);
    process.exit(1);
  }

  const { data: membership, error: memberError } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  if (memberError || !membership?.org_id) {
    console.error("[seed-dt-demo] CEO org membership not found:", memberError?.message);
    process.exit(1);
  }

  const orgId = membership.org_id;

  const { data: existingSpace } = await admin
    .from("digital_twin_spaces")
    .select("id")
    .eq("org_id", orgId)
    .eq("title", DEMO_SPACE_TITLE)
    .is("deleted_at", null)
    .maybeSingle();

  let spaceId = existingSpace?.id ?? null;

  if (!spaceId) {
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projectError || !project?.id) {
      console.error("[seed-dt-demo] No active project for CEO org:", projectError?.message);
      process.exit(1);
    }

    const { data: space, error: spaceError } = await admin
      .from("digital_twin_spaces")
      .insert({
        org_id: orgId,
        project_id: project.id,
        created_by: profile.id,
        title: DEMO_SPACE_TITLE,
        status: "ready",
      })
      .select("id")
      .single();

    if (spaceError || !space?.id) {
      console.error("[seed-dt-demo] Failed to create space:", spaceError?.message);
      process.exit(1);
    }

    spaceId = space.id;
    console.log("[seed-dt-demo] Created space:", spaceId);
  } else {
    console.log("[seed-dt-demo] Reusing space:", spaceId);
  }

  const { data: existingModel } = await admin
    .from("digital_twin_models")
    .select("id")
    .eq("space_id", spaceId)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  let modelId = existingModel?.id ?? null;

  if (!modelId) {
    const { data: model, error: modelError } = await admin
      .from("digital_twin_models")
      .insert({
        org_id: orgId,
        space_id: spaceId,
        title: DEMO_MODEL_TITLE,
        model_format: "spz",
        storage_key: SAMPLE_SPZ_URL,
        is_primary: true,
        status: "ready",
      })
      .select("id")
      .single();

    if (modelError || !model?.id) {
      console.error("[seed-dt-demo] Failed to create model:", modelError?.message);
      process.exit(1);
    }

    modelId = model.id;
    console.log("[seed-dt-demo] Created model:", modelId);
  } else {
    await admin
      .from("digital_twin_models")
      .update({
        title: DEMO_MODEL_TITLE,
        model_format: "spz",
        storage_key: SAMPLE_SPZ_URL,
        status: "ready",
      })
      .eq("id", modelId);

    console.log("[seed-dt-demo] Updated model:", modelId);
  }

  await admin
    .from("digital_twin_spaces")
    .update({ status: "ready", published_model_id: modelId })
    .eq("id", spaceId);

  console.log("[seed-dt-demo] Done");
  console.log(`  Viewer: /digital-twin/twins/${spaceId}`);
  console.log(`  Sample: ${SAMPLE_SPZ_URL}`);
}

main().catch((error) => {
  console.error("[seed-dt-demo] Fatal:", error);
  process.exit(1);
});
