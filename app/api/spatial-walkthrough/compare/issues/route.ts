import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { parseCompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { parseVerification, toCompareIssueRef } from "@/lib/spatial-walkthrough/compare-issue";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    const { data, error } = await admin.from("spatial_compare_issue_refs").select("*").eq("org_id", orgId).eq("project_id", projectId).order("created_at", { ascending: true });
    if (error) return serverError(error.message);
    return ok({ issues: (data ?? []).map((row) => toCompareIssueRef(row)).filter(Boolean) });
  }, "view");

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const before = parseCompareLocator(body?.beforeLocator ?? body?.before);
    const after = parseCompareLocator(body?.afterLocator ?? body?.after);
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    if (!projectId || !before || !after) return badRequest("projectId and both locators required");
    const { data, error } = await admin.from("spatial_compare_issue_refs").insert({
      org_id: orgId,
      project_id: projectId,
      pin_id: typeof body?.pinId === "string" ? body.pinId : null,
      project_item_id: typeof body?.projectItemId === "string" ? body.projectItemId : null,
      title: typeof body?.title === "string" ? body.title : "Issue",
      before_locator: before,
      after_locator: after,
      verification: parseVerification(body?.verification),
    }).select("*").single();
    if (error) return serverError(error.message);
    return created({ issue: toCompareIssueRef(data) });
  }, "author");

export const PATCH = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.id || typeof body.id !== "string") return badRequest("id required");
    const patch: Record<string, unknown> = {};
    if (body.verification != null) patch.verification = parseVerification(body.verification);
    if (typeof body.title === "string") patch.title = body.title;
    const { data, error } = await admin.from("spatial_compare_issue_refs").update(patch).eq("id", body.id).eq("org_id", orgId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Issue reference not found");
    return ok({ issue: toCompareIssueRef(data) });
  }, "author");
