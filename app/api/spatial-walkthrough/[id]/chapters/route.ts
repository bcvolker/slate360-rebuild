import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { CHAPTER_TYPES, assignChapterSort, normalizeTimeRange, toChapter, chapterDeleteTouchesSource } from "@/lib/spatial-walkthrough/chapters";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.clipId || typeof body.name !== "string") return badRequest("clipId and name required");
    const range = normalizeTimeRange(Number(body.startTime), Number(body.endTime));
    if (!range) return badRequest("startTime and endTime required (end > start)");
    const { data: clip } = await admin.from("spatial_clips").select("id").eq("id", body.clipId).eq("walkthrough_id", id).maybeSingle();
    if (!clip) return notFound("Clip not found");
    const type = CHAPTER_TYPES.includes(body.chapterType as never) ? body.chapterType : "other";
    const vis = body.visibility === "internal" || body.visibility === "public" ? body.visibility : "client";
    const { data, error } = await admin.from("spatial_chapters").insert({
      org_id: orgId,
      walkthrough_id: id,
      clip_id: body.clipId,
      name: body.name.trim(),
      building: typeof body.building === "string" ? body.building : null,
      floor: typeof body.floor === "string" ? body.floor : null,
      zone: typeof body.zone === "string" ? body.zone : null,
      chapter_type: type,
      start_time: range.startTime,
      end_time: range.endTime,
      default_yaw: typeof body.defaultYaw === "number" ? body.defaultYaw : 0,
      default_pitch: typeof body.defaultPitch === "number" ? body.defaultPitch : 0,
      visibility: vis,
      description: typeof body.description === "string" ? body.description : null,
      thumbnail_key: typeof body.thumbnailKey === "string" ? body.thumbnailKey : null,
    }).select("*").single();
    if (error) return serverError(error.message);
    const { data: all } = await admin.from("spatial_chapters").select("*").eq("walkthrough_id", id);
    const ordered = assignChapterSort((all ?? []).map(toChapter));
    await Promise.all(ordered.map((c) => admin.from("spatial_chapters").update({ sort_order: c.sortOrder }).eq("id", c.id)));
    return ok({ chapter: data, sourceUntouched: !chapterDeleteTouchesSource() }, 201);
  }, "author");

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (Array.isArray(body?.order)) {
      const ids = (body.order as unknown[]).filter((x): x is string => typeof x === "string");
      await Promise.all(ids.map((chapterId, i) =>
        admin.from("spatial_chapters").update({ sort_order: i }).eq("id", chapterId).eq("walkthrough_id", id).eq("org_id", orgId),
      ));
      return ok({ ok: true });
    }
    if (!body?.id) return badRequest("id required");
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.building === "string" || body.building === null) patch.building = body.building;
    if (typeof body.floor === "string" || body.floor === null) patch.floor = body.floor;
    if (typeof body.zone === "string" || body.zone === null) patch.zone = body.zone;
    if (CHAPTER_TYPES.includes(body.chapterType as never)) patch.chapter_type = body.chapterType;
    if (typeof body.startTime === "number") patch.start_time = body.startTime;
    if (typeof body.endTime === "number") patch.end_time = body.endTime;
    if (typeof body.defaultYaw === "number") patch.default_yaw = body.defaultYaw;
    if (typeof body.defaultPitch === "number") patch.default_pitch = body.defaultPitch;
    if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;
    if (body.visibility === "internal" || body.visibility === "client" || body.visibility === "public") {
      patch.visibility = body.visibility;
    }
    if (typeof body.description === "string" || body.description === null) patch.description = body.description;
    if (typeof body.thumbnailKey === "string" || body.thumbnailKey === null) patch.thumbnail_key = body.thumbnailKey;
    if (patch.start_time != null && patch.end_time != null) {
      const range = normalizeTimeRange(Number(patch.start_time), Number(patch.end_time));
      if (!range) return badRequest("endTime must be after startTime");
      patch.start_time = range.startTime;
      patch.end_time = range.endTime;
    }
    const { data, error } = await admin.from("spatial_chapters").update(patch).eq("id", body.id).eq("walkthrough_id", id).eq("org_id", orgId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Chapter not found");
    return ok({ chapter: data });
  }, "author");

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) return badRequest("id required");
    const { data, error } = await admin.from("spatial_chapters").delete().eq("id", body.id).eq("walkthrough_id", id).eq("org_id", orgId).select("id").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Chapter not found");
    return ok({ deleted: data.id, clipPreserved: true, filesUntouched: true });
  }, "author");
