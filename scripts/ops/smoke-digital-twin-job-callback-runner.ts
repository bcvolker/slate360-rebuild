import { createClient } from "@supabase/supabase-js";
import { handleTwinJobCallback } from "@/lib/twin/job-callback";
import { signWorkerPayload, verifyWorkerSignature } from "@/lib/twin/worker-signature";

function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

async function main() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const secret = getEnv("GPU_WORKER_SECRET_KEY") || "smoke-worker-secret";

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prefix = `__dt_cb_${Date.now()}__`;
  const cleanup: Array<() => Promise<void>> = [];

  const { data: org } = await admin.from("organizations").select("id, credits_balance").limit(1).single();
  if (!org?.id) throw new Error("No org");

  const { data: member } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", org.id)
    .limit(1)
    .single();
  if (!member?.user_id) throw new Error("No org member");

  const { data: project } = await admin
    .from("projects")
    .insert({ name: `${prefix}-project`, org_id: org.id, created_by: member.user_id })
    .select("id")
    .single();
  cleanup.push(async () => {
    await admin.from("projects").delete().eq("id", project!.id);
  });

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .insert({
      org_id: org.id,
      project_id: project!.id,
      created_by: member.user_id,
      title: `${prefix} space`,
      status: "processing",
    })
    .select("id, published_model_id")
    .single();
  cleanup.push(() => admin.from("digital_twin_spaces").delete().eq("id", space!.id));

  const { data: capture } = await admin
    .from("digital_twin_captures")
    .insert({
      org_id: org.id,
      space_id: space!.id,
      project_id: project!.id,
      created_by: member.user_id,
      title: `${prefix} capture`,
      capture_status: "processing",
    })
    .select("id")
    .single();

  const { data: asset } = await admin
    .from("digital_twin_capture_assets")
    .insert({
      org_id: org.id,
      space_id: space!.id,
      capture_id: capture!.id,
      asset_kind: "video",
      file_size_bytes: 64 * 1024 * 1024,
      storage_key: `orgs/${org.id}/digital-twin/${space!.id}/${capture!.id}/smoke.mp4`,
      status: "ready",
    })
    .select("id")
    .single();

  const { data: job } = await admin
    .from("digital_twin_processing_jobs")
    .insert({
      org_id: org.id,
      space_id: space!.id,
      capture_id: capture!.id,
      created_by: member.user_id,
      job_type: "gaussian_splat",
      status: "processing",
      input_asset_ids: [asset!.id],
      output_format: "spz",
      progress_pct: 40,
    })
    .select("id")
    .single();
  cleanup.push(async () => {
    await admin.from("digital_twin_processing_jobs").delete().eq("id", job!.id);
  });

  const outputKey = `orgs/${org.id}/digital-twin/${space!.id}/models/${job!.id}.spz`;
  const payload = {
    jobId: job!.id,
    status: "completed" as const,
    outputKey,
    modelFormat: "spz" as const,
    fileSizeBytes: 12_400_000,
    processedAssetIds: [asset!.id],
    newAssetIds: [asset!.id],
  };

  const rawBody = JSON.stringify(payload);
  const signature = signWorkerPayload(rawBody, secret);

  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    throw new Error("HMAC self-check failed");
  }
  if (verifyWorkerSignature(rawBody, "deadbeef", secret)) {
    throw new Error("Invalid HMAC should not verify");
  }

  const balanceBefore = (
    await admin.from("organizations").select("credits_balance").eq("id", org.id).single()
  ).data?.credits_balance;

  const first = await handleTwinJobCallback(admin, payload);
  if (!first.ok) throw new Error(`Completed callback failed: ${first.error}`);

  const { data: completedNotification } = await admin
    .from("project_notifications")
    .select("id, user_id, project_id, title, message, link_path, is_read, created_at")
    .eq("user_id", member.user_id)
    .eq("link_path", `/digital-twin/twins/${space!.id}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!completedNotification?.id || completedNotification.title !== "Your twin is ready") {
    throw new Error(`Completion notification missing: ${JSON.stringify(completedNotification)}`);
  }
  cleanup.push(async () => {
    await admin.from("project_notifications").delete().eq("id", completedNotification.id);
  });

  const { data: model } = await admin
    .from("digital_twin_models")
    .select("id, storage_key, is_primary, status")
    .eq("processing_job_id", job!.id)
    .single();
  if (!model?.id || model.storage_key !== outputKey || model.status !== "ready") {
    throw new Error("Model row missing or invalid");
  }
  if (!model.is_primary) throw new Error("Expected first model to be primary");

  const { data: jobAfter } = await admin
    .from("digital_twin_processing_jobs")
    .select("status, progress_pct, credits_charged, output_model_id")
    .eq("id", job!.id)
    .single();
  if (jobAfter?.status !== "completed" || jobAfter.progress_pct !== 100) {
    throw new Error(`Job not completed: ${JSON.stringify(jobAfter)}`);
  }

  const { data: spaceAfter } = await admin
    .from("digital_twin_spaces")
    .select("published_model_id, status")
    .eq("id", space!.id)
    .single();
  if (spaceAfter?.published_model_id !== model.id) {
    throw new Error("published_model_id not set");
  }

  const balanceAfterFirst = (
    await admin.from("organizations").select("credits_balance").eq("id", org.id).single()
  ).data?.credits_balance;
  const chargedFirst = (balanceBefore ?? 0) - (balanceAfterFirst ?? 0);
  if (chargedFirst <= 0) throw new Error("Expected credits to be charged");

  const duplicate = await handleTwinJobCallback(admin, payload);
  if (!duplicate.ok || !duplicate.idempotent) {
    throw new Error("Duplicate callback should be idempotent");
  }

  const balanceAfterDup = (
    await admin.from("organizations").select("credits_balance").eq("id", org.id).single()
  ).data?.credits_balance;
  if (balanceAfterDup !== balanceAfterFirst) {
    throw new Error("Duplicate callback double-charged credits");
  }

  const { data: failJob } = await admin
    .from("digital_twin_processing_jobs")
    .insert({
      org_id: org.id,
      space_id: space!.id,
      capture_id: capture!.id,
      created_by: member.user_id,
      job_type: "gaussian_splat",
      status: "processing",
      input_asset_ids: [asset!.id],
      output_format: "spz",
    })
    .select("id")
    .single();
  cleanup.push(async () => {
    await admin.from("digital_twin_processing_jobs").delete().eq("id", failJob!.id);
  });

  const balanceBeforeFail = (
    await admin.from("organizations").select("credits_balance").eq("id", org.id).single()
  ).data?.credits_balance;

  const failed = await handleTwinJobCallback(admin, {
    jobId: failJob!.id,
    status: "failed",
    errorLog: "GPU OOM",
  });
  if (!failed.ok) throw new Error(`Failed callback errored: ${failed.error}`);

  const { data: failedNotification } = await admin
    .from("project_notifications")
    .select("id, user_id, project_id, title, message, link_path, is_read, created_at")
    .eq("user_id", member.user_id)
    .eq("link_path", "/digital-twin/capture/review")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!failedNotification?.id || failedNotification.title !== "Your scan couldn't be processed") {
    throw new Error(`Failure notification missing: ${JSON.stringify(failedNotification)}`);
  }
  cleanup.push(async () => {
    await admin.from("project_notifications").delete().eq("id", failedNotification.id);
  });

  const { data: failAfter } = await admin
    .from("digital_twin_processing_jobs")
    .select("status, error_text, credits_charged")
    .eq("id", failJob!.id)
    .single();
  if (failAfter?.status !== "failed" || !failAfter.error_text?.includes("GPU OOM")) {
    throw new Error("Failed job not recorded");
  }
  if ((failAfter.credits_charged ?? 0) > 0) throw new Error("Failed job should not charge credits");

  const balanceAfterFail = (
    await admin.from("organizations").select("credits_balance").eq("id", org.id).single()
  ).data?.credits_balance;
  if (balanceAfterFail !== balanceBeforeFail) {
    throw new Error("Failed callback should not charge credits");
  }

  cleanup.push(async () => {
    await admin.from("digital_twin_models").delete().eq("id", model.id);
  });

  console.log("[smoke-dt-callback-runner] Results:");
  console.log(`  HMAC verify:          pass`);
  console.log(`  completed callback:   pass (model=${model.id}, charged=${chargedFirst})`);
  console.log(`  completion notify:    pass (${JSON.stringify(completedNotification)})`);
  console.log(`  idempotent retry:     pass`);
  console.log(`  failed callback:      pass (no charge)`);
  console.log(`  failure notify:       pass (${JSON.stringify(failedNotification)})`);

  for (const fn of cleanup.reverse()) {
    try {
      await fn();
    } catch {
      // best-effort
    }
  }
}

main().catch((err) => {
  console.error("[smoke-dt-callback-runner] FAILED:", err);
  process.exit(1);
});
