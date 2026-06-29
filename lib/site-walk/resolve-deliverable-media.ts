import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, s3 } from "@/lib/s3";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";

export const MEDIA_ITEM_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeliverableMediaCtx = {
  session_id: string | null;
  content: unknown;
  shared_snapshot_id: string | null;
};

/**
 * Resolves a deliverable media item to a short-lived signed S3 URL and 307-redirects
 * to it — the SHARED core for both the public (token) and owner (by-id) media routes.
 * The CALLER owns access control (token gating vs org membership); this function only
 * enforces that the item belongs to the deliverable (same walk OR referenced in the
 * served content — the owner-authored block array is the access list) and signs the key.
 */
export async function resolveDeliverableMediaRedirect(
  admin: SupabaseClient,
  del: DeliverableMediaCtx,
  itemId: string,
): Promise<NextResponse> {
  let itemQuery = admin
    .from("site_walk_items")
    .select("id, s3_key, audio_s3_key, session_id")
    .eq("id", itemId);
  itemQuery = excludeDeletedSiteWalkItems(itemQuery);

  const { data: item } = await itemQuery.maybeSingle();

  // Photos/videos resolve via s3_key; voice memos via audio_s3_key.
  const mediaKey = (item?.s3_key as string | null) ?? (item?.audio_s3_key as string | null) ?? null;
  if (!item || !mediaKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
  admin: SupabaseClient,
  del: DeliverableMediaCtx,
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
