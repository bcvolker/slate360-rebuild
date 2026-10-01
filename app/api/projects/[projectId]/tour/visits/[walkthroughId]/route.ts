import { NextRequest, NextResponse } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, conflict, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { enqueueCheckpointStill, loadOwnedRoute, loadTourBundle } from "@/lib/spatial-tour/tour-store";
import { loadVisit, PUBLISHED_LOCK } from "@/lib/spatial-tour/route-guard";
import { publishChecklist } from "@/lib/spatial-tour/publish-checklist";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; walkthroughId: string }> };

const ACTIONS = ["attach", "detach", "retry-stills", "review-stills", "review-privacy", "publish", "unpublish"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Visit lifecycle on the route. Publishing re-runs the checklist here; there is no way to
 * publish a visit from "ready" status alone.
 */
export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId, walkthroughId } = await ctx.params;
    const route = await loadOwnedRoute(admin, orgId, projectId);
    if (!route) return notFound("No route yet");
    const visit = await loadVisit(admin, orgId, projectId, walkthroughId);
    if (!visit) return notFound("Visit not found");
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    const action = ACTIONS.find((a) => a === body?.action) as Action | undefined;
    if (!action) return badRequest(`action must be one of ${ACTIONS.join(", ")}`);
    if (action !== "attach" && visit.route_id !== route.id) return conflict("Add this visit to the route first");

    const now = new Date().toISOString();
    const update = (patch: Record<string, unknown>) => admin.from("spatial_walkthroughs").update(patch).eq("id", walkthroughId);

    if (action === "attach") {
      await update({ route_id: route.id, route_revision: route.revision });
    } else if (action === "detach") {
      if (visit.client_published_at) return conflict(PUBLISHED_LOCK);
      await update({ route_id: null, route_revision: null, stills_reviewed_at: null, privacy_reviewed_at: null });
    } else if (action === "retry-stills") {
      if (visit.client_published_at) return conflict(PUBLISHED_LOCK);
      const { data: failed } = await admin
        .from("spatial_checkpoint_marks")
        .select("id")
        .eq("walkthrough_id", walkthroughId)
        .neq("match", "not_captured")
        .in("still_status", ["failed", "none"]);
      for (const m of failed ?? []) await enqueueCheckpointStill(admin, String(m.id));
    } else if (action === "review-stills" || action === "review-privacy") {
      if (visit.client_published_at) return conflict(PUBLISHED_LOCK);
      if (action === "review-stills") {
        const { count } = await admin
          .from("spatial_checkpoint_marks")
          .select("id", { count: "exact", head: true })
          .eq("walkthrough_id", walkthroughId)
          .neq("match", "not_captured")
          .neq("still_status", "ready");
        if (count) return conflict("Wait until every still is ready, then review them");
      }
      await update(action === "review-stills" ? { stills_reviewed_at: now } : { privacy_reviewed_at: now });
    } else if (action === "publish") {
      const bundle = await loadTourBundle(admin, orgId, projectId);
      const v = bundle.visits.find((x) => x.walkthroughId === walkthroughId);
      if (!v) return notFound("Visit not found");
      const check = publishChecklist({ visit: v, checkpoints: bundle.checkpoints, marks: bundle.marks });
      if (!check.canPublish) {
        return NextResponse.json({ error: "Checklist incomplete", items: check.items }, { status: 409 });
      }
      await update({ client_published_at: now, route_revision: route.revision });
    } else {
      await update({ client_published_at: null });
    }
    const bundle = await loadTourBundle(admin, orgId, projectId).catch((e) => e as Error);
    return bundle instanceof Error ? serverError(bundle.message) : ok(bundle);
  }, "author");
