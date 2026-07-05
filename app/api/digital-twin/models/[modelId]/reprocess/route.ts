import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import {
  assertTwinJobCredits,
  InsufficientTwinCreditsError,
} from "@/lib/twin/job-credits-estimate";
import { assertDigitalTwinProcessingEntitlement } from "@/lib/twin/processing-entitlement";
import { isOwnerEmail } from "@/lib/server/beta-access";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

export const runtime = "nodejs";

const QUALITY_TIERS = new Set<TwinProcessingQuality>(["standard", "high"]);
const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

function parseQuality(value: unknown): TwinProcessingQuality {
  return value === "high" ? "high" : "standard";
}

/**
 * Twin Slice 0: re-run reconstruction for the capture behind an existing model,
 * WITHOUT touching the currently-published model. The new job produces a fresh
 * model row; since the space already has ≥1 model, the callback creates it
 * non-primary (isPrimary = existingModelCount === 0), so the live share link is
 * unaffected until the user explicitly promotes the new version via the publish
 * route. This formalizes the CLI dispatch path used during the R7/R8 work into a
 * user-facing action — same auth/credits/dispatch as initial job creation.
 */
export const POST = (req: NextRequest, ctx: { params: Promise<{ modelId: string }> }) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { modelId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { quality?: string };
    const quality = parseQuality(body.quality);
    if (!QUALITY_TIERS.has(quality)) return badRequest("Invalid quality");

    // Resolve the model → its capture. Reprocess always targets the source
    // capture, never mutates the model itself.
    const { data: model, error: modelError } = await admin
      .from("digital_twin_models")
      .select("id, space_id, capture_id, status")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (modelError) return serverError(modelError.message);
    if (!model) return notFound("Model not found");
    if (!model.capture_id) {
      return badRequest("This model has no source capture to reprocess.");
    }

    try {
      await assertDigitalTwinProcessingEntitlement(admin, {
        orgId,
        userId: user.id,
        userEmail: user.email,
        captureId: model.capture_id,
      });

      if (quality === "high" && !isOwnerEmail(user.email)) {
        const { data: sub } = await admin
          .from("org_app_subscriptions")
          .select("digital_twin")
          .eq("org_id", orgId)
          .maybeSingle();
        if (sub?.digital_twin !== "pro") {
          return forbidden("High quality requires a Pro Digital Twin subscription");
        }
      }

      const { data: capture, error: captureError } = await admin
        .from("digital_twin_captures")
        .select("id, space_id, capture_status")
        .eq("id", model.capture_id)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();
      if (captureError) return serverError(captureError.message);
      if (!capture) return notFound("Source capture not found");

      const { data: assets, error: assetsError } = await admin
        .from("digital_twin_capture_assets")
        .select("id, status, asset_kind")
        .eq("capture_id", model.capture_id)
        .eq("org_id", orgId)
        .eq("status", "ready")
        .is("deleted_at", null);
      if (assetsError) return serverError(assetsError.message);
      if (!assets?.length) {
        // Raw sources were discarded (retain_raw = false at submit time) — there
        // is nothing to reprocess from. Surface this clearly rather than 500ing.
        return badRequest(
          "The original capture files for this twin are no longer stored, so it can't be reprocessed. Recapture the space to try again.",
        );
      }

      try {
        await assertTwinJobCredits(admin, orgId, model.capture_id, "spz", quality);
      } catch (creditErr) {
        if (creditErr instanceof InsufficientTwinCreditsError) {
          return badRequest(creditErr.message);
        }
        throw creditErr;
      }

      const { data: job, error: jobError } = await admin
        .from("digital_twin_processing_jobs")
        .insert({
          org_id: orgId,
          space_id: capture.space_id,
          capture_id: capture.id,
          created_by: user.id,
          job_type: "gaussian_splat",
          status: "queued",
          input_asset_ids: assets.map((row) => row.id),
          output_format: "spz",
        })
        .select("id, status, progress_pct")
        .single();

      if (jobError || !job) return serverError(jobError?.message ?? "Failed to create job");

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
        console.info("[POST /api/digital-twin/models/:id/reprocess] dispatched", {
          jobId: job.id,
          runId: handle.id,
        });
      } catch (dispatchErr) {
        const msg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
        console.error("[reprocess] dispatch failed:", msg);
        await admin
          .from("digital_twin_processing_jobs")
          .update({
            status: "failed",
            error_text: `Dispatch error: ${msg}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        // Reprocess must NOT leave the capture stuck in "processing" — it was
        // "ready" before (a completed model exists). Restore it.
        await admin
          .from("digital_twin_captures")
          .update({ capture_status: "ready" })
          .eq("id", capture.id)
          .eq("org_id", orgId);
        return serverError(`Failed to dispatch reprocess job: ${msg}`);
      }

      return ok({ job, reprocessing: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reprocess";
      if (message.includes("Digital Twin access required")) return forbidden(message);
      if (message.includes("Processing already active")) {
        return forbidden("This twin is already being processed. Wait for it to finish, then try again.");
      }
      console.error("[POST /api/digital-twin/models/:id/reprocess]", err);
      return serverError(message);
    }
  });
