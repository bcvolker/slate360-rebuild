import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, created, badRequest, unauthorized, serverError } from "@/lib/server/api-response";
import { parseCompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { toCompareAnchor } from "@/lib/spatial-walkthrough/compare-anchor";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    const beforeId = req.nextUrl.searchParams.get("before");
    const afterId = req.nextUrl.searchParams.get("after");
    if (!projectId) return badRequest("projectId required");
    let q = admin.from("spatial_compare_anchors").select("*").eq("org_id", orgId).eq("project_id", projectId).order("created_at", { ascending: true });
    if (beforeId) q = q.eq("before_walkthrough_id", beforeId);
    if (afterId) q = q.eq("after_walkthrough_id", afterId);
    const { data, error } = await q;
    if (error) return serverError(error.message);
    return ok({ anchors: (data ?? []).map((row) => toCompareAnchor(row)).filter(Boolean) });
  }, "view");

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const before = parseCompareLocator(body?.before);
    const after = parseCompareLocator(body?.after);
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    if (!projectId || !before || !after) return badRequest("projectId, before, and after locators required");
    if (before.walkthroughId === after.walkthroughId) return badRequest("Compare Anchor must map two captures");
    const { data, error } = await admin.from("spatial_compare_anchors").insert({
      org_id: orgId,
      project_id: projectId,
      created_by: user?.id ?? null,
      label: typeof body?.label === "string" ? body.label.trim() || null : null,
      before_walkthrough_id: before.walkthroughId,
      after_walkthrough_id: after.walkthroughId,
      before_locator: before,
      after_locator: after,
    }).select("*").single();
    if (error) return serverError(error.message);
    return created({ anchor: toCompareAnchor(data) });
  }, "author");
