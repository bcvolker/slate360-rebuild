import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import {
  assertTwinJobCredits,
  InsufficientTwinCreditsError,
} from "@/lib/twin/job-credits-estimate";
import { assertDigitalTwinProcessingEntitlement } from "@/lib/twin/processing-entitlement";
import { isOwnerEmail } from "@/lib/server/beta-access";
import { assertTwinGpuHoldClear, TwinGpuHoldError } from "@/lib/twin/gpu-dispatch-hold";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";
import {
  METRIC_PROCESSOR_JOB_TYPE,
  METRIC_PROCESSOR_OUTPUT_FORMAT,
  metricProcessorInputAssets,
  metricProcessorMissingRequirements,
  twinJobTriggerTaskId,
} from "@/lib/twin/metric-processor-contract";

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
  output_format?: "spz" | "ply" | "glb" | "lidar_potree";
  job_type?: "gaussian_splat" | "photogrammetry_mesh" | "lidar_scan" | "metric_processor";
  lidar_prior_asset_id?: string | null;
  quality?: string;
  align_backend?: "colmap_vanilla" | "colmap_pose_prior";
  /** Explicit operator intent to spend GPU time. Required for paid job types. */
  confirm_processing?: boolean;
};

const OUTPUT_FORMATS = new Set(["spz", "ply", "glb", "lidar_potree"]);
const JOB_TYPES = new Set(["gaussian_splat", "photogrammetry_mesh", "lidar_scan", "metric_processor"]);

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as JobBody | null;
    if (!body?.capture_id) return badRequest("capture_id is required");

    const jobType = body.job_type ?? "gaussian_splat";
    const outputFormat =
      body.output_format ?? (jobType === METRIC_PROCESSOR_JOB_TYPE ? METRIC_PROCESSOR_OUTPUT_FORMAT : "spz");
    const quality = parseQuality(body.quality);

    // A capture must never turn into GPU spend as a side effect of uploading.
    // The capture flow was auto-enqueuing a gaussian_splat job the moment assets
    // landed, so a scan taken purely to be archived or processed elsewhere still
    // billed for a photoreal reconstruction nobody asked for. Intent is now
    // explicit, and it is enforced HERE rather than in any one caller so no
    // future screen can reintroduce the same surprise.
    if (!body.confirm_processing) {
      return badRequest(
        "Processing must be explicitly requested. Upload and archive do not start a job; " +
          "send confirm_processing:true to spend GPU time.",
      );
    }

    try {
      assertTwinGpuHoldClear();
    } catch (holdErr) {
      if (holdErr instanceof TwinGpuHoldError) return badRequest(holdErr.message);
      throw holdErr;
    }

    if (!OUTPUT_FORMATS.has(outputFormat)) return badRequest("Invalid output_format");
    if (!JOB_TYPES.has(jobType)) return badRequest("Invalid job_type");
    if (jobType === "gaussian_splat" && outputFormat !== "spz") {
      return badRequest("Gaussian-splat jobs currently support only spz output");
    }
    if (jobType === "photogrammetry_mesh" && outputFormat !== "glb") {
      return badRequest("Exterior photogrammetry jobs currently support only glb output");
    }
    if (jobType === "lidar_scan" && outputFormat !== "lidar_potree") {
      return badRequest("LiDAR scan jobs currently support only lidar_potree output");
    }
    if (jobType === METRIC_PROCESSOR_JOB_TYPE && outputFormat !== METRIC_PROCESSOR_OUTPUT_FORMAT) {
      return badRequest("Metric processor jobs currently support only glb output (geometry master)");
    }
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

      // P0a — fetch ALL live assets, not just `ready` ones. Previously this filtered to
      // status = "ready", so an asset still uploading was silently EXCLUDED from the job
      // rather than blocking it: that is how the 2026-07-08 capture processed against an
      // incomplete triplicate set. Now a capture with work in flight is refused outright.
      const { data: allAssets, error: assetsError } = await admin
        .from("digital_twin_capture_assets")
        .select("id, status, asset_kind")
        .eq("capture_id", body.capture_id)
        .eq("org_id", orgId)
        .is("deleted_at", null);

      if (assetsError) return serverError(assetsError.message);

      const pending = (allAssets ?? []).filter(
        (a) => a.status === "uploading" || a.status === "pending",
      );
      if (pending.length) {
        return badRequest(
          `${pending.length} file${pending.length === 1 ? " is" : "s are"} still uploading — ` +
            "wait for the upload to finish before processing.",
        );
      }

      const assets = (allAssets ?? []).filter((a) => a.status === "ready");
      if (!assets.length) return badRequest("No ready assets on capture");

      await assertTwinHighQualityEntitlement(admin, orgId, user.email, quality);

      try {
        // Credit calculation is intentionally format-agnostic today; use the
        // existing accepted format type until the protected pricing module gets
        // an approved LiDAR-specific billing slice.
        const creditOutputFormat = outputFormat === "lidar_potree" ? "ply" : outputFormat;
        await assertTwinJobCredits(admin, orgId, body.capture_id, creditOutputFormat, quality);
      } catch (creditErr) {
        if (creditErr instanceof InsufficientTwinCreditsError) {
          return badRequest(creditErr.message);
        }
        throw creditErr;
      }

      const inputAssets =
        jobType === "lidar_scan"
          ? assets.filter((row) => row.asset_kind === "lidar_scan")
          : jobType === METRIC_PROCESSOR_JOB_TYPE
            ? metricProcessorInputAssets(assets)
            : assets;
      if (jobType === "lidar_scan" && !inputAssets.length) {
        return badRequest("No ready LiDAR scan assets on capture");
      }
      if (jobType === METRIC_PROCESSOR_JOB_TYPE) {
        const missing = metricProcessorMissingRequirements(assets);
        if (missing) return badRequest(missing);
      }
      const inputAssetIds = inputAssets.map((row) => row.id);

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
        const taskId = twinJobTriggerTaskId(job.job_type);
        const handle = await tasks.trigger(
          taskId,
          {
            jobId: job.id,
            quality,
            ...(body.align_backend ? { alignBackend: body.align_backend } : {}),
          },
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
