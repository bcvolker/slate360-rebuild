import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, conflict, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { loadOwnedRoute, loadTourBundle } from "@/lib/spatial-tour/tour-store";
import { loadVisit, projectInOrg } from "@/lib/spatial-tour/route-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

/** Operator Tour bundle: route, chapters, checkpoints, visits and marks. */
export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    if (!(await projectInOrg(admin, orgId, projectId))) return notFound("Project not found");
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");

/**
 * Create the project's route from its first visit. Chapters start from that visit's own
 * chapters (or one "Full walk" chapter); checkpoints are added by scrubbing.
 */
export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    if (!(await projectInOrg(admin, orgId, projectId))) return notFound("Project not found");
    if (await loadOwnedRoute(admin, orgId, projectId)) return conflict("This project already has a route");
    const body = (await req.json().catch(() => null)) as { name?: unknown; fromWalkthroughId?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const fromId = typeof body?.fromWalkthroughId === "string" ? body.fromWalkthroughId : "";
    if (!name) return badRequest("Name the route");
    const visit = fromId ? await loadVisit(admin, orgId, projectId, fromId) : null;
    if (!visit) return badRequest("Pick the visit that defines the route");

    const { data: route, error } = await admin
      .from("spatial_routes")
      .insert({ org_id: orgId, project_id: projectId, name, created_by: user.id })
      .select("id")
      .single();
    if (error || !route) return serverError(error?.message ?? "Could not create route");

    const { data: visitChapters } = await admin
      .from("spatial_chapters")
      .select("name, start_time")
      .eq("walkthrough_id", visit.id)
      .order("start_time");
    const names = (visitChapters ?? []).map((c) => String(c.name)).filter(Boolean);
    const rows = (names.length ? names : ["Full walk"]).map((n, i) => ({ org_id: orgId, route_id: route.id, name: n, sort_order: i }));
    const { error: chErr } = await admin.from("spatial_route_chapters").insert(rows);
    if (chErr) return serverError(chErr.message);
    await admin.from("spatial_walkthroughs").update({ route_id: route.id, route_revision: 1 }).eq("id", visit.id);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");

/** Rename the route or edit the capture card header notes. */
export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const body = (await req.json().catch(() => null)) as { name?: unknown; captureNotes?: unknown } | null;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.captureNotes === "string") patch.capture_notes = body.captureNotes.trim() || null;
    const { error } = await admin.from("spatial_routes").update(patch).eq("id", route.id);
    if (error) return serverError(error.message);
    return ok(await loadTourBundle(admin, orgId, projectId));
  }, "author");
