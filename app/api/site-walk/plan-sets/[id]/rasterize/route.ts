import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, ok, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: planSet, error } = await admin
      .from("site_walk_plan_sets")
      .select("id, org_id, source_s3_key, processing_status")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!planSet) return notFound("Plan set not found");
    if (!planSet.source_s3_key) return badRequest("Plan set has no source PDF to rasterize");

    // Check if there's an existing job for this plan set
    const { data: existingJobs } = await admin
      .from("plan_raster_jobs")
      .select("id, status, created_at")
      .eq("plan_set_id", id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestJob = existingJobs?.[0];
    const latestJobIsStale = latestJob ? isStaleJob(latestJob.created_at) : false;

    // If already running and fresh, don't double-queue. Stale queued/processing rows
    // are exactly what old plans get stuck on, so mark them failed and create a new job.
    if ((latestJob?.status === "queued" || latestJob?.status === "processing") && !latestJobIsStale) {
      return ok({ status: latestJob.status, message: "Rasterization already in progress" });
    }
    if ((latestJob?.status === "queued" || latestJob?.status === "processing") && latestJobIsStale) {
      await admin
        .from("plan_raster_jobs")
        .update({ status: "failed", error_text: "Stale queued job replaced by manual Generate Mobile View request." })
        .eq("id", latestJob.id);
    }

    // Insert (or re-insert) a raster job row
    let jobId = latestJob?.id;
    if (!latestJob || latestJob.status === "failed" || latestJob.status === "completed" || latestJobIsStale) {
      const { data: newJob, error: insertErr } = await admin
        .from("plan_raster_jobs")
        .insert({ org_id: orgId, plan_set_id: id, status: "queued" })
        .select("id")
        .single();
      if (insertErr) console.error("[rasterize-route] Failed to insert job:", insertErr);
      jobId = newJob?.id;
    }

    // Clear the failed state optimistically so the retry reads as "trying again," not
    // a stale error card, while dispatch is in flight.
    await admin
      .from("site_walk_plan_sets")
      .update({ processing_status: "pending", processing_error: null })
      .eq("id", id);

    // Fire Trigger.dev — no silent guards. If this throws, write the error to the DB so
    // PlanViewer can surface it as a red card instead of an infinite spinner.
    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      const handle = await tasks.trigger("plan.rasterize", { planSetId: id, orgId }, undefined, triggerRequestOptions);
      console.info("[rasterize-route] Trigger.dev dispatch accepted", { planSetId: id, runId: handle.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rasterize-route] Trigger.dev dispatch failed:", msg);
      if (jobId) {
        await admin
          .from("plan_raster_jobs")
          .update({ status: "failed", error_text: `Vercel Dispatch Error: ${msg}` })
          .eq("id", jobId);
      }
      await admin
        .from("site_walk_plan_sets")
        .update({ processing_status: "failed", processing_error: `Dispatch failed: ${msg}` })
        .eq("id", id);
      return ok({
        jobId,
        status: "failed",
        error: `Vercel Dispatch Error: ${msg}`,
        message: "Trigger.dev dispatch failed. Check error_text in plan_raster_jobs for details.",
      });
    }

    return ok({
      jobId,
      status: "queued",
      triggerDispatched: true,
      message: "Rasterization queued — plan will appear automatically.",
    });
  });

function isStaleJob(value: string | null | undefined) {
  if (!value) return false;
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt > 5 * 60 * 1000;
}
