import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { canAuthorNarration, toNarrationSegment, trimSegment } from "@/lib/spatial-walkthrough/audio";
import { recordSpatialEvent } from "@/lib/spatial-walkthrough/audio-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canAuthorNarration({ isCeo: access.isCeo, canAuthor: access.canAuthor })) {
      return badRequest("Narration authoring is CEO/admin only");
    }
    const { id, segmentId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("Invalid JSON");
    const { data: current } = await admin.from("spatial_narration_segments").select("*").eq("id", segmentId).eq("walkthrough_id", id).maybeSingle();
    if (!current) return notFound("Segment not found");
    const next = trimSegment(toNarrationSegment(current as Record<string, unknown>), Number(body.startTime ?? current.start_time), Number(body.endTime ?? current.end_time));
    if (!next) return badRequest("Invalid trim");
    const patch: Record<string, unknown> = {
      start_time: next.startTime,
      end_time: next.endTime,
      updated_at: new Date().toISOString(),
    };
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.speaker === "string") patch.speaker = body.speaker;
    if (typeof body.volume === "number") patch.volume = body.volume;
    if (typeof body.chapterId === "string" || body.chapterId === null) patch.chapter_id = body.chapterId;
    const { data, error } = await admin.from("spatial_narration_segments").update(patch).eq("id", segmentId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    return ok({ segment: toNarrationSegment(data as Record<string, unknown>) });
  }, "author");

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canAuthorNarration({ isCeo: access.isCeo, canAuthor: access.canAuthor })) {
      return badRequest("Narration authoring is CEO/admin only");
    }
    const { id, segmentId } = await ctx.params;
    const { error } = await admin.from("spatial_narration_segments").delete().eq("id", segmentId).eq("walkthrough_id", id);
    if (error) return serverError(error.message);
    await recordSpatialEvent(admin, { orgId, walkthroughId: id, kind: "narration.deleted", payload: { segmentId } });
    return ok({ deleted: true });
  }, "author");
