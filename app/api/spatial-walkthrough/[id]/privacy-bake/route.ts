import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, notFound, badRequest } from "@/lib/server/api-response";
import { parseOperatorPatch, resolveOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const clipId = typeof body?.clipId === "string" ? body.clipId : "";
    if (!clipId) return badRequest("clipId required");

    const { data: clip } = await admin
      .from("spatial_clips")
      .select("id, proxy_key, operator_patch, walkthrough_id")
      .eq("id", clipId)
      .eq("walkthrough_id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!clip?.proxy_key) return notFound("Ready proxy required before public bake");

    const { data: wt } = await admin
      .from("spatial_walkthroughs")
      .select("operator_patch")
      .eq("id", id)
      .maybeSingle();
    const operatorPatch = resolveOperatorPatch(clip.operator_patch, parseOperatorPatch(wt?.operator_patch));

    const { data: job, error } = await admin.from("spatial_processing_jobs").insert({
      org_id: orgId,
      walkthrough_id: id,
      clip_id: clipId,
      job_type: "privacy-bake",
      status: "queued",
      source_s3_key: clip.proxy_key,
      metadata: { mode: "privacy-bake", operatorPatch },
    }).select("id").single();
    if (error || !job) return badRequest(error?.message ?? "Could not queue bake");

    const origin = req.nextUrl.origin;
    await tasks.trigger("spatial-walkthrough.ingest", {
      jobId: job.id,
      callbackBaseUrl: origin,
      mode: "privacy-bake",
    });
    return ok({ queued: true, jobId: job.id });
  }, "author");
