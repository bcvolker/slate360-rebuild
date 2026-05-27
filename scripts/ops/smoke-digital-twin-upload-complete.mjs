#!/usr/bin/env node

/**
 * Server-side smoke test for Digital Twin upload-complete platform hooks.
 * Simulates post-multipart state and validates:
 *   - increment_org_storage (storage metering)
 *   - digital_twin_processing_jobs insert (status = queued)
 *   - Trigger task dispatch (twin.gaussian_splat) when credentials exist
 *
 * Usage:
 *   node scripts/ops/smoke-digital-twin-upload-complete.mjs
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

  if (!supabaseUrl || !serviceRole) {
    console.log("[smoke-dt-complete] SKIPPED: missing Supabase credentials");
    process.exit(0);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testPrefix = `__dt_smoke_${Date.now()}__`;
  const cleanup = [];
  const results = {
    storageMetering: "pending",
    jobQueued: "pending",
    triggerDispatch: "pending",
  };

  try {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (orgError || !org?.id) {
      throw new Error(orgError?.message ?? "No organization found");
    }

    const { data: member } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", org.id)
      .limit(1)
      .single();

    if (!member?.user_id) {
      throw new Error("No organization member found");
    }

    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        name: `${testPrefix}-project`,
        org_id: org.id,
        created_by: member.user_id,
      })
      .select("id")
      .single();

    if (projectError || !project?.id) {
      throw new Error(projectError?.message ?? "Project creation failed");
    }
    cleanup.push(() => admin.from("projects").delete().eq("id", project.id));

    const { data: space, error: spaceError } = await admin
      .from("digital_twin_spaces")
      .insert({
        org_id: org.id,
        project_id: project.id,
        created_by: member.user_id,
        title: `${testPrefix} space`,
        status: "draft",
      })
      .select("id")
      .single();

    if (spaceError || !space?.id) {
      throw new Error(spaceError?.message ?? "Space creation failed");
    }
    cleanup.push(() => admin.from("digital_twin_spaces").delete().eq("id", space.id));

    const { data: capture, error: captureError } = await admin
      .from("digital_twin_captures")
      .insert({
        org_id: org.id,
        space_id: space.id,
        project_id: project.id,
        created_by: member.user_id,
        title: `${testPrefix} capture`,
        capture_status: "uploading",
      })
      .select("id")
      .single();

    if (captureError || !capture?.id) {
      throw new Error(captureError?.message ?? "Capture creation failed");
    }

    const fileSizeBytes = 1024 * 512;
    const storageKey = `orgs/${org.id}/digital-twin/${space.id}/${capture.id}/${testPrefix}.jpg`;

    const { data: asset, error: assetError } = await admin
      .from("digital_twin_capture_assets")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        asset_kind: "photo",
        upload_tier: "standard",
        storage_key: storageKey,
        content_type: "image/jpeg",
        file_size_bytes: fileSizeBytes,
        status: "ready",
      })
      .select("id")
      .single();

    if (assetError || !asset?.id) {
      throw new Error(assetError?.message ?? "Asset creation failed");
    }

    let storageBefore = null;
    const { data: storageBeforeRpc, error: storageBeforeError } = await admin.rpc(
      "get_storage_used",
      { p_org_id: org.id },
    );
    if (!storageBeforeError && typeof storageBeforeRpc === "number") {
      storageBefore = storageBeforeRpc;
    }

    const { error: storageError } = await admin.rpc("increment_org_storage", {
      target_org_id: org.id,
      bytes_delta: fileSizeBytes,
    });

    if (storageError) {
      results.storageMetering = `fail: ${storageError.message}`;
    } else {
      const { data: storageAfterRpc, error: storageAfterError } = await admin.rpc(
        "get_storage_used",
        { p_org_id: org.id },
      );

      if (
        !storageAfterError &&
        typeof storageBefore === "number" &&
        typeof storageAfterRpc === "number"
      ) {
        const delta = storageAfterRpc - storageBefore;
        results.storageMetering =
          delta >= fileSizeBytes ? `pass (+${delta} bytes via get_storage_used)` : `fail: delta=${delta}`;
      } else {
        results.storageMetering = "pass (increment_org_storage RPC succeeded)";
      }
    }

    const { data: job, error: jobError } = await admin
      .from("digital_twin_processing_jobs")
      .insert({
        org_id: org.id,
        space_id: space.id,
        capture_id: capture.id,
        created_by: member.user_id,
        job_type: "gaussian_splat",
        status: "queued",
        input_asset_ids: [asset.id],
        output_format: "spz",
      })
      .select("id, status")
      .single();

    if (jobError || !job?.id) {
      results.jobQueued = `fail: ${jobError?.message ?? "no row"}`;
    } else {
      cleanup.push(() => admin.from("digital_twin_processing_jobs").delete().eq("id", job.id));
      results.jobQueued = job.status === "queued" ? `pass (${job.id})` : `fail: status=${job.status}`;
    }

    if (job?.id) {
      if (!getEnv("TRIGGER_SECRET_KEY")) {
        results.triggerDispatch = "skipped (TRIGGER_SECRET_KEY not set)";
      } else {
        try {
        const { tasks } = await import("@trigger.dev/sdk/v3");
        const handle = await tasks.trigger(
          "twin.gaussian_splat",
          {
            jobId: job.id,
            orgId: org.id,
            spaceId: space.id,
            captureId: capture.id,
          },
          undefined,
          { clientConfig: { previewBranch: "" } },
        );

        await admin
          .from("digital_twin_processing_jobs")
          .update({ worker_run_id: handle.id })
          .eq("id", job.id);

        const { data: jobAfter } = await admin
          .from("digital_twin_processing_jobs")
          .select("worker_run_id, status")
          .eq("id", job.id)
          .single();

        results.triggerDispatch = jobAfter?.worker_run_id
          ? `pass (run=${jobAfter.worker_run_id}, status=${jobAfter.status})`
          : "fail: worker_run_id not persisted";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("digital_twin_processing_jobs")
          .update({ status: "failed", error_text: `Trigger dispatch: ${msg}` })
          .eq("id", job.id);
        results.triggerDispatch = `fail: ${msg}`;
        }
      }
    } else {
      results.triggerDispatch = "skipped (job insert failed)";
    }

    console.log("[smoke-dt-complete] Results:");
    console.log(`  storage metering: ${results.storageMetering}`);
    console.log(`  job queued:       ${results.jobQueued}`);
    console.log(`  trigger dispatch: ${results.triggerDispatch}`);

    const failed = Object.values(results).some((v) => v.startsWith("fail"));
    if (failed) {
      console.error("\n[smoke-dt-complete] FAILED");
      process.exit(1);
    }

    console.log("\n[smoke-dt-complete] PASS");
  } finally {
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        // best-effort cleanup
      }
    }
  }
}

main().catch((error) => {
  console.error("[smoke-dt-complete] Unexpected error:", error);
  process.exit(1);
});
