/**
 * GET /api/view/[token]/media/[itemId]
 *
 * Public media resolver for shared deliverables. Validates the token is
 * an active (non-revoked, non-expired) deliverable, confirms the item
 * belongs to the same session, then 307-redirects to a short-lived
 * signed S3 GET URL. Anonymous — share token is the access control.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveDeliverableMediaRedirect,
  MEDIA_ITEM_UUID_RE,
} from "@/lib/site-walk/resolve-deliverable-media";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string; itemId: string }> },
) {
  const { token, itemId } = await ctx.params;

  if (!TOKEN_RE.test(token) || !MEDIA_ITEM_UUID_RE.test(itemId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Share-path gate: the token is the access control (revoke/expire/view-limit).
  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("id, session_id, content, shared_snapshot_id, share_revoked, share_expires_at, share_max_views, share_view_count")
    .eq("share_token", token)
    .maybeSingle();

  if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (del.share_revoked) return NextResponse.json({ error: "Revoked" }, { status: 410 });
  if (del.share_expires_at && new Date(del.share_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }
  if (del.share_max_views != null && (del.share_view_count ?? 0) > del.share_max_views) {
    return NextResponse.json({ error: "View limit reached" }, { status: 410 });
  }

  return resolveDeliverableMediaRedirect(admin, del, itemId);
}
