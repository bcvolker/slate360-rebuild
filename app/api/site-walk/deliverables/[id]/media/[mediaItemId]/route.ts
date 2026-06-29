/**
 * GET /api/site-walk/deliverables/[id]/media/[mediaItemId]
 *
 * Owner media resolver for the in-app deliverable preview. Auth is the
 * authenticated org (withAppAuth + org_id scope) — NOT a share token — so it serves
 * drafts/unshared deliverables and never applies share revoke/expiry/view-limit.
 * Reads LIVE content (no snapshot) and delegates the item-authorization + S3 signing
 * to the SAME resolver the public token route uses, so the two paths can't drift.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import {
  resolveDeliverableMediaRedirect,
  MEDIA_ITEM_UUID_RE,
} from "@/lib/site-walk/resolve-deliverable-media";

export const GET = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string; mediaItemId: string }> },
) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    const { id, mediaItemId } = await ctx.params;
    if (!orgId || !MEDIA_ITEM_UUID_RE.test(id) || !MEDIA_ITEM_UUID_RE.test(mediaItemId)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id, session_id, content, shared_snapshot_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Owner preview reads live content — null the snapshot so the shared resolver
    // authorizes against what the owner is actually viewing.
    return resolveDeliverableMediaRedirect(
      admin,
      { session_id: del.session_id, content: del.content, shared_snapshot_id: null },
      mediaItemId,
    );
  });
