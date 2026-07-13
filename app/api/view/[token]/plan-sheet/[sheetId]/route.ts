/**
 * GET /api/view/[token]/plan-sheet/[sheetId]
 *
 * Public plan-sheet image resolver for shared deliverables (the plan stage —
 * B1.8). Mirrors /api/view/[token]/media/[itemId]: validates the token is an
 * active (non-revoked, non-expired, under view-limit) deliverable, confirms
 * the sheet belongs to the SAME session's project (not an arbitrary sheet id
 * from another job), then 307-redirects to a short-lived signed S3 GET URL.
 * Anonymous — the share token is the access control.
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string; sheetId: string }> },
) {
  const { token, sheetId } = await ctx.params;

  if (!TOKEN_RE.test(token) || !UUID_RE.test(sheetId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("session_id, share_revoked, share_expires_at, share_max_views, share_view_count")
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
  if (!del.session_id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("project_id")
    .eq("id", del.session_id)
    .maybeSingle();
  if (!session?.project_id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: sheet } = await admin
    .from("site_walk_plan_sheets")
    .select("rasterized_key, project_id")
    .eq("id", sheetId)
    .maybeSingle();

  if (!sheet?.rasterized_key || sheet.project_id !== session.project_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: sheet.rasterized_key }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url, 307);
}
