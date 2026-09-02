import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { parseCompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { toCompareAnchor } from "@/lib/spatial-walkthrough/compare-anchor";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ anchorId: string }> };

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { anchorId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("body required");
    const patch: Record<string, unknown> = {};
    if (typeof body.label === "string" || body.label === null) patch.label = body.label;
    const before = body.before ? parseCompareLocator(body.before) : null;
    const after = body.after ? parseCompareLocator(body.after) : null;
    if (body.before && !before) return badRequest("before locator invalid");
    if (body.after && !after) return badRequest("after locator invalid");
    if (before) {
      patch.before_locator = before;
      patch.before_walkthrough_id = before.walkthroughId;
    }
    if (after) {
      patch.after_locator = after;
      patch.after_walkthrough_id = after.walkthroughId;
    }
    const { data, error } = await admin.from("spatial_compare_anchors").update(patch).eq("id", anchorId).eq("org_id", orgId).select("*").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Compare Anchor not found");
    return ok({ anchor: toCompareAnchor(data) });
  }, "author");

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { anchorId } = await ctx.params;
    const { data, error } = await admin.from("spatial_compare_anchors").delete().eq("id", anchorId).eq("org_id", orgId).select("id").maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Compare Anchor not found");
    return ok({ ok: true });
  }, "author");
