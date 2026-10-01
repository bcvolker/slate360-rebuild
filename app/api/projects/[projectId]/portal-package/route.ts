import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { loadDirectedTourEnabled, loadPortalPackage } from "@/lib/spatial-experience/portal-package-load";
import { loadPortalReadiness } from "@/lib/spatial-experience/portal-readiness";
import {
  DELIVERABLE_LABELS,
  PACKAGE_DELIVERABLES,
  normalizeDeliverables,
} from "@/lib/spatial-experience/portal-package";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

/** Operator view of the client portal package for one project. */
export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    const enabled = await loadDirectedTourEnabled(admin, orgId);
    if (!enabled) return ok({ enabled: false });
    const [pkg, { readiness, previewWalkthroughId }] = await Promise.all([
      loadPortalPackage(admin, projectId),
      loadPortalReadiness(admin, projectId),
    ]);
    const included = new Set(pkg?.deliverables ?? []);
    return ok({
      enabled: true,
      canPreview: Boolean(previewWalkthroughId),
      deliverables: PACKAGE_DELIVERABLES.map((id) => ({
        id,
        label: DELIVERABLE_LABELS[id],
        included: included.has(id),
        ready: readiness[id].ready,
        note: readiness[id].note,
      })),
    });
  }, "author");

/** Replace the offered deliverables. Deliverables not offered in the panel yet are kept as they are. */
export const PUT = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    if (!(await loadDirectedTourEnabled(admin, orgId))) return badRequest("Client portal packaging is not enabled");
    const body = (await req.json().catch(() => null)) as { deliverables?: unknown } | null;
    if (!body || !Array.isArray(body.deliverables)) return badRequest("deliverables must be a list");
    const offered = new Set<string>(PACKAGE_DELIVERABLES);
    const chosen = normalizeDeliverables(body.deliverables).filter((d) => offered.has(d));
    const existing = await loadPortalPackage(admin, projectId);
    const kept = (existing?.deliverables ?? []).filter((d) => !offered.has(d));
    const { error } = await admin.from("spatial_portal_packages").upsert(
      {
        org_id: orgId,
        project_id: projectId,
        deliverables: [...kept, ...chosen],
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
    if (error) return serverError(error.message);
    return ok({ deliverables: chosen });
  }, "author");
