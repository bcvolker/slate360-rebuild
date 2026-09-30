import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, conflict, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { loadOwnedRoute, loadTourBundle } from "@/lib/spatial-tour/tour-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

/** Add a chapter at the end of the route. */
export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("Name the chapter");
    const { data: last } = await admin
      .from("spatial_route_chapters")
      .select("sort_order")
      .eq("route_id", route.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin
      .from("spatial_route_chapters")
      .insert({ org_id: orgId, route_id: route.id, name, sort_order: Number(last?.sort_order ?? -1) + 1 });
    if (error) return serverError(error.message);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");

/**
 * Rename (links keep working: they carry the stable id) or retire a chapter. Retiring
 * needs its checkpoints retired first, so no checkpoint is left without a chapter.
 */
export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as { chapterId?: unknown; name?: unknown; retire?: unknown } | null;
    const chapterId = typeof body?.chapterId === "string" ? body.chapterId : "";
    const { data: chapter } = await admin
      .from("spatial_route_chapters")
      .select("id")
      .eq("id", chapterId)
      .eq("route_id", route.id)
      .maybeSingle();
    if (!chapter) return notFound("Chapter not found");
    const patch: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body?.retire === true) {
      const { count } = await admin
        .from("spatial_route_checkpoints")
        .select("id", { count: "exact", head: true })
        .eq("route_chapter_id", chapterId)
        .is("retired_at", null);
      if (count) return conflict("Retire this chapter's checkpoints first");
      patch.retired_at = new Date().toISOString();
    }
    if (!Object.keys(patch).length) return badRequest("Nothing to change");
    const { error } = await admin.from("spatial_route_chapters").update(patch).eq("id", chapterId);
    if (error) return serverError(error.message);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");
