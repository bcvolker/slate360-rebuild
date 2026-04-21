/**
 * GET /api/view/[token]/media/[itemId]
 *
 * Public media resolver for shared deliverables. Validates the token is
 * an active (non-revoked, non-expired) deliverable, confirms the item
 * belongs to the same session, then 307-redirects to a short-lived
 * signed S3 GET URL. Anonymous — share token is the access control.
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { BUCKET, s3 } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string; itemId: string }> },
) {
  const { token, itemId } = await ctx.params;

  if (!TOKEN_RE.test(token) || !UUID_RE.test(itemId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("id, session_id, share_revoked, share_expires_at")
    .eq("share_token", token)
    .maybeSingle();

  if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (del.share_revoked) return NextResponse.json({ error: "Revoked" }, { status: 410 });
  if (del.share_expires_at && new Date(del.share_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  const { data: item } = await admin
    .from("site_walk_items")
    .select("id, s3_key, session_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.session_id !== del.session_id || !item.s3_key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: item.s3_key }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url, 307);
}
