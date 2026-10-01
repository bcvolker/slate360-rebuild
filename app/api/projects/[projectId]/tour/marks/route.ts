import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, conflict, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { enqueueCheckpointStill, loadOwnedRoute, loadTourBundle } from "@/lib/spatial-tour/tour-store";
import { loadVisit, PUBLISHED_LOCK } from "@/lib/spatial-tour/route-guard";
import type { MatchQuality } from "@/lib/spatial-tour/types";
import { clampViewIntoCone, parseLookCone } from "@/lib/spatial-tour/look-cone";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

const MATCHES: MatchQuality[] = ["matched", "same_chapter", "not_captured"];
const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Set where one visit shows one checkpoint. Frames (matched / approximate) must sit on a
 * clip with an operator-free public proxy and a published view (look cone); the view
 * direction is pulled inside the cone so the still can never include the operator. The
 * still is re-extracted and the visit's reviews are cleared, because the stills changed.
 */
export const PUT = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const checkpointId = typeof body?.checkpointId === "string" ? body.checkpointId : "";
    const walkthroughId = typeof body?.walkthroughId === "string" ? body.walkthroughId : "";
    const match = MATCHES.find((m) => m === body?.match);
    if (!match) return badRequest("match must be matched, same_chapter or not_captured");

    const visit = await loadVisit(admin, orgId, projectId, walkthroughId);
    if (!visit || visit.route_id !== route.id) return notFound("Visit is not on this route");
    if (visit.client_published_at) return conflict(PUBLISHED_LOCK);
    const { data: cp } = await admin
      .from("spatial_route_checkpoints")
      .select("id, retired_at")
      .eq("id", checkpointId)
      .eq("route_id", route.id)
      .maybeSingle();
    if (!cp || cp.retired_at) return notFound("Checkpoint not found");

    const row: Record<string, unknown> = {
      org_id: orgId,
      checkpoint_id: checkpointId,
      walkthrough_id: walkthroughId,
      match,
      set_by: user.id,
      confirmed_at: new Date().toISOString(),
      clip_id: null,
      t_seconds: null,
      yaw_deg: 0,
      pitch_deg: 0,
      still_key: null,
      still_status: "none",
      still_error: null,
      still_black_fraction: null,
    };
    if (match !== "not_captured") {
      const clipId = typeof body?.clipId === "string" ? body.clipId : "";
      const t = finite(body?.t);
      if (t == null || t < 0) return badRequest("t (seconds) is required for a frame");
      const { data: clip } = await admin
        .from("spatial_clips")
        .select("id, duration_s, public_proxy_key, look_cone")
        .eq("id", clipId)
        .eq("walkthrough_id", walkthroughId)
        .maybeSingle();
      if (!clip) return notFound("Clip not found on this visit");
      if (!clip.public_proxy_key) return conflict("Run the privacy bake on this clip before marking it");
      if (clip.duration_s != null && t > Number(clip.duration_s)) return badRequest("t is past the end of the clip");
      const cone = parseLookCone(clip.look_cone);
      if (!cone) return conflict("Set the published view for this visit before marking it");
      const view = clampViewIntoCone(cone, finite(body?.yaw) ?? cone.headingDeg, finite(body?.pitch) ?? 0);
      Object.assign(row, { clip_id: clipId, t_seconds: t, yaw_deg: view.yaw, pitch_deg: view.pitch });
    }

    const { data: saved, error } = await admin
      .from("spatial_checkpoint_marks")
      .upsert(row, { onConflict: "checkpoint_id,walkthrough_id" })
      .select("id")
      .single();
    if (error || !saved) return serverError(error?.message ?? "Could not save mark");
    await admin.from("spatial_walkthroughs").update({ stills_reviewed_at: null, privacy_reviewed_at: null }).eq("id", walkthroughId);
    if (match !== "not_captured") await enqueueCheckpointStill(admin, String(saved.id));
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");
