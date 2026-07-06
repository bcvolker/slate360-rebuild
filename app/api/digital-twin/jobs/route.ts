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

function parseQuality(value: unknown): TwinProcessingQuality {
  return value === "high" ? "high" : "standard";
}

async function assertTwinHighQualityEntitlement(
  admin: Parameters<typeof assertDigitalTwinProcessingEntitlement>[0],
  orgId: string,
  userEmail: string | null | undefined,
  quality: TwinProcessingQuality,
) {
  if (quality !== "high") return;
  if (isOwnerEmail(userEmail)) return;

  const { data, error } = await admin
    .from("org_app_subscriptions")
    .select("digital_twin")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data?.digital_twin !== "pro") {
    throw new Error("High quality requires a Pro Digital Twin subscription");
  }
}

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

type JobBody = {
  capture_id: string;
  output_format?: "spz" | "ply" | "glb";
  job_type?: "gaussian_splat" | "photogrammetry_mesh" | "lidar_fusion";
  lidar_prior_asset_id?: string | null;
  quality?: string;
};

const OUTPUT_FORMATS = new Set(["spz", "ply", "glb"]);
const JOB_TYPES = new Set(["gaussian_splat", "photogrammetry_mesh", "lidar_fusion"]);

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as JobBody | null;
    if (!body?.capture_id) return badRequest("capture_id is required");

    const outputFormat = body.output_format ?? "spz";
    const jobType = body.job_type ?? "gaussian_splat";
    const quality = parseQuality(body.quality);

    if (!OUTPUT_FORMATS.has(outputFormat)) return badRequest("Invalid output_format");
    // C5: only spz ever actually ships — the enum stays for the future, but ply/glb
    // requests are rejected now rather than silently priced and never honored.
    if (outputFormat !== "spz") {
      return badRequest("Only spz output is currently supported for digital twins");
    }
    if (!JOB_TYPES.has(jobType)) return badRequest("Invalid job_type");
    if (!QUALITY_TIERS.has(quality)) return badRequest("Invalid quality");

    try {
      await assertDigitalTwinProcessingEntitlement(admin, {
        orgId,
        userId: user.id,
        userEmail: user.email,
        captureId: body.capture_id,
      });

      const { data: capture, error: captureError } = await admin
        .from("digital_twin_captures")
        .select("id, space_id, capture_status")
        .eq("id", body.capture_id)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();

      if (captureError) return serverError(captureError.message);
      if (!capture) return notFound("Capture not found");

      const { data: assets, error: assetsError } = await admin
        .from("digital_twin_capture_assets")
        .select("id, status, asset_kind")
        .eq("capture_id", body.capture_id)
        .eq("org_id", orgId)
        .eq("status", "ready")
        .is("deleted_at", null);

      if (assetsError) return serverError(assetsError.message);
      if (!assets?.length) return badRequest("No ready assets on capture");

      await assertTwinHighQualityEntitlement(admin, orgId, user.email, quality);

      try {
        await assertTwinJobCredits(admin, orgId, body.capture_id, outputFormat, quality);
      } catch (creditErr) {
        if (creditErr instanceof InsufficientTwinCreditsError) {
          return badRequest(creditErr.message);
        }
        throw creditErr;
      }

      const inputAssetIds = assets.map((row) => row.id);

      const { data: job, error: jobError } = await admin
        .from("digital_twin_processing_jobs")
        .insert({
          org_id: orgId,
          space_id: capture.space_id,
          capture_id: capture.id,
          created_by: user.id,
          job_type: jobType,
          status: "queued",
          input_asset_ids: inputAssetIds,
          output_format: outputFormat,
          lidar_prior_asset_id: body.lidar_prior_asset_id ?? null,
        })
        .select("id, status, progress_pct, output_format, job_type")
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
        console.info("[POST /api/digital-twin/jobs] Trigger dispatch accepted", {
          jobId: job.id,
          runId: handle.id,
        });
      } catch (dispatchErr) {
        const msg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
        console.error("[POST /api/digital-twin/jobs] Trigger dispatch failed:", msg);
        await admin
          .from("digital_twin_processing_jobs")
          .update({
            status: "failed",
            error_text: `Dispatch error: ${msg}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await admin
          .from("digital_twin_captures")
          .update({ capture_status: "failed", error_text: `Dispatch error: ${msg}` })
          .eq("id", capture.id)
          .eq("org_id", orgId);
        return serverError(`Failed to dispatch processing job: ${msg}`);
      }

      return ok({ job, triggerDispatched: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create job";
      if (message.includes("Digital Twin access required")) return forbidden(message);
      if (message.includes("Processing already active")) return forbidden(message);
      if (message.includes("High quality requires")) return forbidden(message);
      console.error("[POST /api/digital-twin/jobs]", err);
      return serverError(message);
    }
  });
