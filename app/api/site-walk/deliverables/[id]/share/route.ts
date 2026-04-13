/**
 * POST /api/site-walk/deliverables/[id]/share — generate a share link
 *
 * Creates a unique share_token and sets status to "shared".
 * Re-calling returns the existing token if already shared.
 * Supports optional expires_at and max_views.
 */
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

type SharePayload = {
  expires_at?: string;
  max_views?: number;
};

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as SharePayload;

    // Fetch current deliverable
    const { data: existing, error: fetchErr } = await admin
      .from("site_walk_deliverables")
      .select("id, share_token, status, share_revoked")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchErr || !existing) return notFound("Deliverable not found");

    // If already shared and not revoked, return existing token
    if (existing.share_token && !existing.share_revoked) {
      return ok({ share_token: existing.share_token });
    }

    const token = randomBytes(24).toString("base64url");

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .update({
        share_token: token,
        shared_at: new Date().toISOString(),
        status: "shared",
        share_revoked: false,
        share_view_count: 0,
        share_expires_at: body.expires_at ?? null,
        share_max_views: body.max_views ?? null,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id, share_token")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Deliverable not found");
    return ok({ share_token: data.share_token });
  });
