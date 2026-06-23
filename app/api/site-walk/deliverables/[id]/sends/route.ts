/**
 * GET /api/site-walk/deliverables/[id]/sends
 *
 * Send history for a deliverable (org-scoped) — recipient, mode, channels,
 * status, and timestamp. Backs the "Previously sent" list in the Send panel.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data } = await admin
      .from("site_walk_deliverable_sends")
      .select("id, recipient_email, recipient_phone, delivery_mode, status, sent_at, created_at, metadata")
      .eq("deliverable_id", id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    return ok({ sends: data ?? [] });
  });
