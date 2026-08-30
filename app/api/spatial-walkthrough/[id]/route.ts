import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { parseOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { stripMasterKeys } from "@/lib/spatial-walkthrough/derivatives";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const { data: walkthrough, error } = await admin
      .from("spatial_walkthroughs")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!walkthrough) return notFound("Walkthrough not found");

    const [{ data: clips }, { data: waypoints }, { data: pins }, { data: redactions }, { data: shares }] =
      await Promise.all([
        admin.from("spatial_clips").select("*").eq("walkthrough_id", id).order("sort_order"),
        admin.from("spatial_waypoints").select("*").eq("walkthrough_id", id).order("sort_order"),
        admin.from("spatial_pins").select("*").eq("walkthrough_id", id),
        admin.from("spatial_redactions").select("*").eq("walkthrough_id", id),
        admin
          .from("spatial_share_tokens")
          .select("id, token_prefix, policy, expires_at, max_views, view_count, is_revoked, allow_download, created_at")
          .eq("walkthrough_id", id)
          .order("created_at", { ascending: false }),
      ]);
    const pinIds = (pins ?? []).map((p) => p.id);
    const { data: attachments } = pinIds.length
      ? await admin.from("spatial_pin_attachments").select("*").in("pin_id", pinIds)
      : { data: [] as never[] };

    return ok({
      walkthrough,
      clips: (clips ?? []).map((c) => stripMasterKeys(c as Record<string, unknown>)),
      waypoints: waypoints ?? [],
      pins: pins ?? [],
      attachments: attachments ?? [],
      redactions: redactions ?? [],
      shares: shares ?? [],
    });
  }, "view");

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("Invalid JSON");

    if (typeof body.clipId === "string" && body.clipOperatorPatch && typeof body.clipOperatorPatch === "object") {
      const { data: clip, error } = await admin
        .from("spatial_clips")
        .update({ operator_patch: parseOperatorPatch(body.clipOperatorPatch) })
        .eq("id", body.clipId)
        .eq("walkthrough_id", id)
        .eq("org_id", orgId)
        .select("id, operator_patch")
        .maybeSingle();
      if (error) return serverError(error.message);
      if (!clip) return notFound("Clip not found");
      return ok({ clip });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.building === "string" || body.building === null) patch.building = body.building;
    if (typeof body.floor === "string" || body.floor === null) patch.floor = body.floor;
    if (typeof body.zone === "string" || body.zone === null) patch.zone = body.zone;
    if (typeof body.walkthroughType === "string") patch.walkthrough_type = body.walkthroughType;
    if (typeof body.capturedAt === "string") patch.captured_at = body.capturedAt;
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.defaultPolicy === "string" && body.defaultPolicy !== "master") patch.default_policy = body.defaultPolicy;
    if (body.operatorPatch && typeof body.operatorPatch === "object") {
      patch.operator_patch = parseOperatorPatch(body.operatorPatch);
    }
    if (body.brandTheme && typeof body.brandTheme === "object") patch.brand_theme = body.brandTheme;
    const { data, error } = await admin
      .from("spatial_walkthroughs")
      .update(patch)
      .eq("id", id)
      .eq("org_id", orgId)
      .select("*")
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Walkthrough not found");
    return ok({ walkthrough: data });
  }, "author");
