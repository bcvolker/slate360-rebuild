import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { loadOwnedRoute, loadTourBundle } from "@/lib/spatial-tour/tour-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

async function hasPublishedVisit(admin: Parameters<typeof loadTourBundle>[0], routeId: string): Promise<boolean> {
  const { count } = await admin
    .from("spatial_walkthroughs")
    .select("id", { count: "exact", head: true })
    .eq("route_id", routeId)
    .not("client_published_at", "is", null);
  return Boolean(count);
}

/**
 * Add a checkpoint at the end of a chapter. Once any visit is published this is a
 * material route change: the route revision goes up and the checkpoint records it, so
 * earlier visits read it as "not captured" rather than pretending to cover it.
 */
export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as { chapterId?: unknown; label?: unknown; captureNote?: unknown } | null;
    const chapterId = typeof body?.chapterId === "string" ? body.chapterId : "";
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label) return badRequest("Name the checkpoint");
    const { data: chapter } = await admin
      .from("spatial_route_chapters")
      .select("id, retired_at")
      .eq("id", chapterId)
      .eq("route_id", route.id)
      .maybeSingle();
    if (!chapter || chapter.retired_at) return notFound("Chapter not found");

    let revision = route.revision;
    if (await hasPublishedVisit(admin, route.id)) {
      revision += 1;
      await admin.from("spatial_routes").update({ revision, updated_at: new Date().toISOString() }).eq("id", route.id);
    }
    const { data: last } = await admin
      .from("spatial_route_checkpoints")
      .select("sort_order")
      .eq("route_id", route.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin.from("spatial_route_checkpoints").insert({
      org_id: orgId,
      route_id: route.id,
      route_chapter_id: chapterId,
      label,
      capture_note: typeof body?.captureNote === "string" && body.captureNote.trim() ? body.captureNote.trim() : null,
      sort_order: Number(last?.sort_order ?? -1) + 1,
      introduced_in_revision: revision,
    });
    if (error) return serverError(error.message);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");

/** Relabel, change the capture note, or retire (optionally pointing old links at a replacement). */
export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as {
      checkpointId?: unknown;
      label?: unknown;
      captureNote?: unknown;
      retire?: unknown;
      replacedBy?: unknown;
    } | null;
    const checkpointId = typeof body?.checkpointId === "string" ? body.checkpointId : "";
    const { data: cp } = await admin
      .from("spatial_route_checkpoints")
      .select("id")
      .eq("id", checkpointId)
      .eq("route_id", route.id)
      .maybeSingle();
    if (!cp) return notFound("Checkpoint not found");
    const patch: Record<string, unknown> = {};
    if (typeof body?.label === "string" && body.label.trim()) patch.label = body.label.trim();
    if (typeof body?.captureNote === "string") patch.capture_note = body.captureNote.trim() || null;
    if (body?.retire === true) {
      patch.retired_at = new Date().toISOString();
      if (typeof body.replacedBy === "string" && body.replacedBy !== checkpointId) patch.replaced_by = body.replacedBy;
    }
    if (!Object.keys(patch).length) return badRequest("Nothing to change");
    const { error } = await admin.from("spatial_route_checkpoints").update(patch).eq("id", checkpointId);
    if (error) return serverError(error.message);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");
