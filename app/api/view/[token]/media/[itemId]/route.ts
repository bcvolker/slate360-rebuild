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
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";

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
    .select("id, session_id, content, shared_snapshot_id, share_revoked, share_expires_at")
    .eq("share_token", token)
    .maybeSingle();

  if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (del.share_revoked) return NextResponse.json({ error: "Revoked" }, { status: 410 });
  if (del.share_expires_at && new Date(del.share_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  let itemQuery = admin.from("site_walk_items").select("id, s3_key, audio_s3_key, session_id").eq("id", itemId);
  itemQuery = excludeDeletedSiteWalkItems(itemQuery);

  const { data: item } = await itemQuery.maybeSingle();

  // Photos/videos resolve via s3_key; voice memos via audio_s3_key.
  const mediaKey = (item?.s3_key as string | null) ?? (item?.audio_s3_key as string | null) ?? null;
  if (!item || !mediaKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorize: the item is in this deliverable's walk, OR (for cross-walk
  // deliverables like Before/After) it's explicitly referenced in the
  // deliverable's content — the owner-authored block array is the access list.
  const referenced = await isItemReferenced(admin, del, itemId);
  if (item.session_id !== del.session_id && !referenced) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: mediaKey }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url, 307);
}

/** True if `itemId` is referenced as a mediaItemId in the deliverable's served
 * content (the pinned snapshot when present, else live content). */
async function isItemReferenced(
  admin: ReturnType<typeof createAdminClient>,
  del: { content: unknown; shared_snapshot_id: string | null },
  itemId: string,
): Promise<boolean> {
  let content = del.content;
  if (del.shared_snapshot_id) {
    const { data: snap } = await admin
      .from("site_walk_deliverable_snapshots")
      .select("snapshot_content")
      .eq("id", del.shared_snapshot_id)
      .maybeSingle();
    if (snap) content = (snap as { snapshot_content: unknown }).snapshot_content;
  }
  if (!Array.isArray(content)) return false;
  return content.some(
    (block) =>
      block &&
      typeof block === "object" &&
      (block as Record<string, unknown>).mediaItemId === itemId,
  );
}
