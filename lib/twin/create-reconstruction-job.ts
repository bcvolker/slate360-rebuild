import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertTwinJobCredits,
  InsufficientTwinCreditsError,
} from "@/lib/twin/job-credits-estimate";
import { assertDigitalTwinProcessingEntitlement } from "@/lib/twin/processing-entitlement";
import { isOwnerEmail } from "@/lib/server/beta-access";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

export type CreateReconstructionJobResult =
  | { ok: true; job: { id: string; status: string; progress_pct: number | null } }
  | { ok: false; status: number; error: string };

/**
 * Shared "enqueue a Gaussian-splat reconstruction job for an existing capture"
 * orchestration — the exact sequence the initial POST /jobs route does, factored
 * out so the user-facing reprocess/retry paths (model-level and capture-level)
 * share one implementation instead of three divergent copies. The original
 * /jobs route is intentionally left untouched (it works); this helper backs the
 * reprocess routes only.
 *
 * Non-destructive by construction: the job callback creates a NEW model row and
 * only auto-publishes when the space has zero models yet (isPrimary =
 * existingModelCount === 0), so re-running a space that already has a model
 * never disturbs the live share link — the user promotes the new version
 * explicitly via the publish route.
 */
export async function createReconstructionJob(
  admin: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    userEmail: string | null | undefined;
    captureId: string;
    quality: TwinProcessingQuality;
  },
): Promise<CreateReconstructionJobResult> {
  const { orgId, userId, userEmail, captureId, quality } = params;

  try {
    await assertDigitalTwinProcessingEntitlement(admin, {
      orgId,
      userId,
      userEmail,
      captureId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entitlement check failed";
    if (message.includes("Digital Twin access required")) return { ok: false, status: 403, error: message };
    if (message.includes("Processing already active")) {
      return {
        ok: false,
        status: 409,
        error: "This twin is already being processed. Wait for it to finish, then try again.",
      };
    }
    return { ok: false, status: 500, error: message };
  }

  if (quality === "high" && !isOwnerEmail(userEmail)) {
    const { data: sub } = await admin
      .from("org_app_subscriptions")
      .select("digital_twin")
      .eq("org_id", orgId)
      .maybeSingle();
    if (sub?.digital_twin !== "pro") {
      return { ok: false, status: 403, error: "High quality requires a Pro Digital Twin subscription" };
    }
  }

  const { data: capture, error: captureError } = await admin
    .from("digital_twin_captures")
    .select("id, space_id, capture_status")
    .eq("id", captureId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (captureError) return { ok: false, status: 500, error: captureError.message };
  if (!capture) return { ok: false, status: 404, error: "Source capture not found" };
  const priorCaptureStatus = capture.capture_status ?? "ready";

  const { data: assets, error: assetsError } = await admin
    .from("digital_twin_capture_assets")
    .select("id, status")
    .eq("capture_id", captureId)
    .eq("org_id", orgId)
    .eq("status", "ready")
    .is("deleted_at", null);
  if (assetsError) return { ok: false, status: 500, error: assetsError.message };
  if (!assets?.length) {
    return {
      ok: false,
      status: 400,
      error:
        "The original capture files are no longer stored, so this can't be reprocessed. Recapture the space to try again.",
    };
  }

  try {
    await assertTwinJobCredits(admin, orgId, captureId, "spz", quality);
  } catch (creditErr) {
    if (creditErr instanceof InsufficientTwinCreditsError) {
      return { ok: false, status: 400, error: creditErr.message };
    }
    const message = creditErr instanceof Error ? creditErr.message : "Credit check failed";
    return { ok: false, status: 500, error: message };
  }

  const { data: job, error: jobError } = await admin
    .from("digital_twin_processing_jobs")
    .insert({
      org_id: orgId,
      space_id: capture.space_id,
      capture_id: capture.id,
      created_by: userId,
      job_type: "gaussian_splat",
      status: "queued",
      input_asset_ids: assets.map((row) => row.id),
      output_format: "spz",
    })
    .select("id, status, progress_pct")
    .single();
  if (jobError || !job) return { ok: false, status: 500, error: jobError?.message ?? "Failed to create job" };

  await admin
    .from("digital_twin_captures")
    .update({ capture_status: "processing" })
    .eq("id", capture.id)
    .eq("org_id", orgId);

  try {
    const { tasks } = await import("@trigger.dev/sdk/v3");
    const handle = await tasks.trigger(
      "twin.gaussian_splat",
      { jobId: job.id, quality },
      undefined,
      triggerRequestOptions,
    );
    console.info("[createReconstructionJob] dispatched", { jobId: job.id, runId: handle.id });
  } catch (dispatchErr) {
    const msg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
    console.error("[createReconstructionJob] dispatch failed:", msg);
    await admin
      .from("digital_twin_processing_jobs")
      .update({
        status: "failed",
        error_text: `Dispatch error: ${msg}`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    // Restore the capture to whatever it was before (ready for a reprocess,
    // failed for a retry) — never leave it stuck "processing" after a dispatch
    // that never actually started.
    await admin
      .from("digital_twin_captures")
      .update({ capture_status: priorCaptureStatus })
      .eq("id", capture.id)
      .eq("org_id", orgId);
    return { ok: false, status: 500, error: `Failed to dispatch reconstruction job: ${msg}` };
  }

  return { ok: true, job };
}
