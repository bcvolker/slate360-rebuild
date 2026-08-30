import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { assignSortOrder } from "@/lib/spatial-walkthrough/waypoints";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

function rowToWp(row: Record<string, unknown>): WaypointRecord {
  return {
    id: String(row.id),
    clipId: String(row.clip_id),
    tSeconds: Number(row.t_seconds),
    label: (row.label as string) ?? null,
    zone: (row.zone as string) ?? null,
    yawDeg: Number(row.yaw_deg ?? 0),
    pitchDeg: Number(row.pitch_deg ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    thumbnailKey: (row.thumbnail_key as string) ?? null,
    xyz: row.xyz,
    isVisible: row.is_visible !== false,
  };
}

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.clipId || typeof body.tSeconds !== "number") return badRequest("clipId and tSeconds required");
    const { data: clip } = await admin.from("spatial_clips").select("id").eq("id", body.clipId).eq("walkthrough_id", id).maybeSingle();
    if (!clip) return notFound("Clip not found");
    const { data, error } = await admin.from("spatial_waypoints").insert({
      org_id: orgId,
      walkthrough_id: id,
      clip_id: body.clipId,
      t_seconds: body.tSeconds,
      label: typeof body.label === "string" ? body.label : null,
      zone: typeof body.zone === "string" ? body.zone : null,
      yaw_deg: typeof body.yawDeg === "number" ? body.yawDeg : 0,
      pitch_deg: typeof body.pitchDeg === "number" ? body.pitchDeg : 0,
      is_visible: body.isVisible !== false,
    }).select("*").single();
    if (error) return serverError(error.message);
    const { data: all } = await admin.from("spatial_waypoints").select("*").eq("clip_id", body.clipId);
    const ordered = assignSortOrder((all ?? []).map(rowToWp));
    await Promise.all(ordered.map((w) => admin.from("spatial_waypoints").update({ sort_order: w.sortOrder }).eq("id", w.id)));
    return ok({ waypoint: data }, 201);
  }, "author");

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    await ctx.params;
    const body = (await req.json().catch(() => null)) as { id?: string; isVisible?: boolean; label?: string; zone?: string } | null;
    if (!body?.id) return badRequest("id required");
    const patch: Record<string, unknown> = {};
    if (typeof body.isVisible === "boolean") patch.is_visible = body.isVisible;
    if (typeof body.label === "string") patch.label = body.label;
    if (typeof body.zone === "string") patch.zone = body.zone;
    const { data, error } = await admin.from("spatial_waypoints").update(patch).eq("id", body.id).eq("org_id", orgId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Waypoint not found");
    return ok({ waypoint: data });
  }, "author");
