import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { TRANSITION_TYPES } from "@/lib/spatial-walkthrough/clip-edges";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.sourceClipId || !body?.destClipId) return badRequest("sourceClipId and destClipId required");
    if (body.sourceClipId === body.destClipId) return badRequest("Edges connect distinct clips");
    const ids = [body.sourceClipId, body.destClipId];
    const { data: clips } = await admin.from("spatial_clips").select("id").eq("walkthrough_id", id).in("id", ids);
    if ((clips ?? []).length !== 2) return notFound("Clip not found");
    const kind = TRANSITION_TYPES.includes(body.transitionType as never) ? body.transitionType : "manual";
    const { data, error } = await admin.from("spatial_clip_edges").insert({
      org_id: orgId,
      walkthrough_id: id,
      source_clip_id: body.sourceClipId,
      dest_clip_id: body.destClipId,
      source_endpoint: body.sourceEndpoint === "start" ? "start" : "end",
      dest_endpoint: body.destEndpoint === "end" ? "end" : "start",
      default_yaw: typeof body.defaultYaw === "number" ? body.defaultYaw : 0,
      default_pitch: typeof body.defaultPitch === "number" ? body.defaultPitch : 0,
      transition_type: kind,
    }).select("*").single();
    if (error) return serverError(error.message);
    return ok({ edge: data }, 201);
  }, "author");

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.id) return badRequest("id required");
    const patch: Record<string, unknown> = {};
    if (body.sourceEndpoint === "start" || body.sourceEndpoint === "end") patch.source_endpoint = body.sourceEndpoint;
    if (body.destEndpoint === "start" || body.destEndpoint === "end") patch.dest_endpoint = body.destEndpoint;
    if (TRANSITION_TYPES.includes(body.transitionType as never)) patch.transition_type = body.transitionType;
    if (typeof body.defaultYaw === "number") patch.default_yaw = body.defaultYaw;
    if (typeof body.defaultPitch === "number") patch.default_pitch = body.defaultPitch;
    const { data, error } = await admin.from("spatial_clip_edges").update(patch).eq("id", body.id).eq("org_id", orgId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Edge not found");
    return ok({ edge: data });
  }, "author");

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) return badRequest("id required");
    const { data, error } = await admin.from("spatial_clip_edges").delete().eq("id", body.id).eq("walkthrough_id", id).eq("org_id", orgId).select("id").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Edge not found");
    return ok({ deleted: data.id });
  }, "author");
