import type { SupabaseClient } from "@supabase/supabase-js";
import { deductCredits, type DeductResult } from "@/lib/credits/idempotency";
import { notifyTwinJobOutcome } from "@/lib/twin/notify-twin-job-complete";
import { computeTwinProcessingCredits } from "@/lib/twin/processing-credits";
import { bridgeTwinCompletionToSlateDrop } from "@/lib/twin/slatedrop-bridge";
import { softDeleteTwinCaptureAsset } from "@/lib/twin/soft-delete";

type AdminClient = SupabaseClient;

const CONCURRENT_BALANCE_ERROR = "Balance changed concurrently — retry";

// Multiple twin jobs completing within seconds of each other race on the same
// org's credit balance (optimistic lock in deductCredits). The idempotency key
// (dt-job:{id}) makes retrying the whole call safe — a losing attempt never
// wrote anything, so there's nothing to double-charge or roll back.
async function deductCreditsWithRetry(
  admin: AdminClient,
  orgId: string,
  amount: number,
  idempotencyKey: string,
  description: string,
  maxAttempts = 4,
): Promise<DeductResult> {
  let result: DeductResult = { ok: false, error: "deductCredits never ran" };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    result = await deductCredits(admin, orgId, amount, idempotencyKey, description);
    if (result.ok || result.error !== CONCURRENT_BALANCE_ERROR) return result;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));
    }
  }
  return result;
}

export type TwinWorkerCallbackPayload = {
  jobId: string;
  status: "completed" | "failed";
  outputKey?: string;
  modelFormat?: "spz" | "ply" | "glb";
  fileSizeBytes?: number;
  processedAssetIds?: string[];
  newAssetIds?: string[];
  errorLog?: string;
  costCredits?: number;
  bounds?: Record<string, unknown>;
  qualityMetrics?: Record<string, unknown>;
  floorplanKey?: string | null;
};

export type TwinJobCallbackResult = {
  ok: boolean;
  status: number;
  error?: string;
  modelId?: string;
  creditsCharged?: number;
  idempotent?: boolean;
};

export async function handleTwinJobCallback(
  admin: AdminClient,
  body: TwinWorkerCallbackPayload,
): Promise<TwinJobCallbackResult> {
  if (!body?.jobId || !body.status) {
    return { ok: false, status: 400, error: "jobId and status are required" };
  }

  const { data: job, error: jobError } = await admin
    .from("digital_twin_processing_jobs")
    .select(
      "id, org_id, space_id, capture_id, created_by, status, output_format, job_type, credits_charged, output_model_id, created_at",
    )
    .eq("id", body.jobId)
    .maybeSingle();

  if (jobError) return { ok: false, status: 500, error: jobError.message };
  if (!job) return { ok: false, status: 404, error: "Job not found" };

  if (job.status === "completed") {
    return {
      ok: true,
      status: 200,
      modelId: job.output_model_id ?? undefined,
      creditsCharged: job.credits_charged ?? 0,
      idempotent: true,
    };
  }

  if (job.status === "failed" && body.status === "failed") {
    return { ok: true, status: 200, idempotent: true };
  }

  if (body.status === "failed") {
    const { error } = await admin
      .from("digital_twin_processing_jobs")
      .update({
        status: "failed",
        error_text: body.errorLog ?? "Worker reported failure",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (error) return { ok: false, status: 500, error: error.message };

    if (job.capture_id) {
      await admin
        .from("digital_twin_captures")
        .update({ capture_status: "failed", error_text: body.errorLog ?? "Processing failed" })
        .eq("id", job.capture_id)
        .eq("org_id", job.org_id);
    }

    const { data: failedSpace } = await admin
      .from("digital_twin_spaces")
      .select("project_id, created_by, title, created_at")
      .eq("id", job.space_id)
      .maybeSingle();

    const failedUserId = job.created_by ?? failedSpace?.created_by;
    if (failedUserId && failedSpace?.project_id) {
      await notifyTwinJobOutcome({
        admin,
        userId: failedUserId,
        projectId: failedSpace.project_id,
        spaceId: job.space_id,
        spaceTitle: failedSpace.title,
        referenceDate: job.created_at ?? failedSpace.created_at,
        outcome: "failed",
      });
    }

    return { ok: true, status: 200 };
  }

  if (!body.outputKey) {
    return { ok: false, status: 400, error: "outputKey is required for completed callbacks" };
  }

  const modelFormat = body.modelFormat ?? job.output_format ?? "spz";
  const chargeAssetIds = (body.newAssetIds?.length ? body.newAssetIds : body.processedAssetIds) ?? [];

  const { data: chargeAssets } = chargeAssetIds.length
    ? await admin
        .from("digital_twin_capture_assets")
        .select("id, asset_kind, file_size_bytes")
        .in("id", chargeAssetIds)
        .eq("org_id", job.org_id)
    : { data: [] as { id: string; asset_kind: string; file_size_bytes: number }[] };

  const creditsToCharge = computeTwinProcessingCredits(chargeAssets ?? []);
  const idempotencyKey = `dt-job:${job.id}`;

  const deduct = await deductCreditsWithRetry(
    admin,
    job.org_id,
    creditsToCharge,
    idempotencyKey,
    `Digital Twin ${job.job_type ?? "gaussian_splat"} job ${job.id}`,
  );

  if (!deduct.ok) {
    return { ok: false, status: 409, error: deduct.error ?? "Credit deduction failed" };
  }

  const { count: existingModelCount } = await admin
    .from("digital_twin_models")
    .select("id", { count: "exact", head: true })
    .eq("space_id", job.space_id)
    .eq("org_id", job.org_id)
    .is("deleted_at", null);

  const isPrimary = (existingModelCount ?? 0) === 0;
  const fileSizeBytes = body.fileSizeBytes ?? 0;
  const qualityMetrics = {
    ...(body.qualityMetrics ?? {}),
    fileSizeBytes,
    processedAssetCount: body.processedAssetIds?.length ?? 0,
    newAssetCount: body.newAssetIds?.length ?? 0,
  };

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("project_id, created_by, title, created_at")
    .eq("id", job.space_id)
    .maybeSingle();

  const { data: model, error: modelError } = await admin
    .from("digital_twin_models")
    .insert({
      org_id: job.org_id,
      space_id: job.space_id,
      capture_id: job.capture_id,
      processing_job_id: job.id,
      title: space?.title ? `${space.title} model` : "Twin model",
      model_format: modelFormat,
      storage_key: body.outputKey,
      file_size_bytes: fileSizeBytes,
      bounds: body.bounds ?? {},
      quality_metrics: qualityMetrics,
      is_primary: isPrimary,
      status: "ready",
      floorplan_storage_key: body.floorplanKey ?? null,
    })
    .select("id")
    .single();

  if (modelError || !model?.id) {
    return { ok: false, status: 500, error: modelError?.message ?? "Failed to create model" };
  }

  if (space?.project_id && job.created_by) {
    // Bridge the raw model into Models AND register the presentable twin as a
    // deliverable link in Deliverables (primary model only). Both non-fatal.
    await bridgeTwinCompletionToSlateDrop(admin, {
      modelId: model.id,
      storageKey: body.outputKey,
      modelFormat,
      fileSize: fileSizeBytes,
      projectId: space.project_id,
      orgId: job.org_id,
      userId: job.created_by,
      spaceId: job.space_id,
      title: space.title ?? "Untitled Twin",
      isPrimary,
    });
  }

  const completedAt = new Date().toISOString();

  await admin
    .from("digital_twin_processing_jobs")
    .update({
      status: "completed",
      progress_pct: 100,
      output_storage_key: body.outputKey,
      output_model_id: model.id,
      credits_charged: creditsToCharge,
      completed_at: completedAt,
      error_text: null,
    })
    .eq("id", job.id);

  if (job.capture_id) {
    await admin
      .from("digital_twin_captures")
      .update({ capture_status: "ready" })
      .eq("id", job.capture_id)
      .eq("org_id", job.org_id);

    // Honor the user's raw-retention choice. If they opted not to keep the raw
    // source files, discard them now that the model exists (the model lives in a
    // separate table and is untouched). Default is to keep.
    const { data: capture } = await admin
      .from("digital_twin_captures")
      .select("capture_metadata")
      .eq("id", job.capture_id)
      .eq("org_id", job.org_id)
      .maybeSingle();
    const retainRaw = (capture?.capture_metadata as { retain_raw?: boolean } | null)?.retain_raw;
    if (retainRaw === false && job.created_by) {
      const { data: rawAssets } = await admin
        .from("digital_twin_capture_assets")
        .select("id")
        .eq("capture_id", job.capture_id)
        .eq("org_id", job.org_id)
        .is("deleted_at", null)
        .neq("status", "archived");
      for (const asset of rawAssets ?? []) {
        await softDeleteTwinCaptureAsset(admin, {
          assetId: asset.id as string,
          orgId: job.org_id,
          deletedBy: job.created_by,
        });
      }
    }
  }

  if (isPrimary) {
    await admin
      .from("digital_twin_spaces")
      .update({ published_model_id: model.id, status: "ready" })
      .eq("id", job.space_id)
      .eq("org_id", job.org_id);
  }

  await admin.from("digital_twin_usage_events").insert({
    org_id: job.org_id,
    space_id: job.space_id,
    capture_id: job.capture_id,
    event_type: "gaussian_splat_job",
    quantity: creditsToCharge,
    unit: "credits",
    source_table: "digital_twin_processing_jobs",
    source_id: job.id,
    metadata: {
      modelId: model.id,
      outputKey: body.outputKey,
      newAssetIds: body.newAssetIds ?? [],
    },
  });

  const notifyUserId = job.created_by ?? space?.created_by;
  if (notifyUserId && space?.project_id) {
    await notifyTwinJobOutcome({
      admin,
      userId: notifyUserId,
      projectId: space.project_id,
      spaceId: job.space_id,
      spaceTitle: space.title,
      referenceDate: job.created_at ?? space.created_at,
      outcome: "completed",
    });
  }

  return {
    ok: true,
    status: 200,
    modelId: model.id,
    creditsCharged: creditsToCharge,
  };
}
