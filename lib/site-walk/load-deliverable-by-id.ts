import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { finishViewerDeliverable } from "@/lib/site-walk/load-deliverable";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";

/**
 * Owner-by-id deliverable loader (authenticated, org-scoped). Powers the in-app
 * owner preview at `/site-walk/deliverables/[id]` so an owner can open ANY of their
 * deliverables — including `draft`/unshared with no share token — from SlateDrop.
 *
 * Unlike the public token loader this:
 *  - gates on `org_id` (the caller must pass the authenticated org), not a token;
 *  - reads LIVE content (ignores `shared_snapshot_id`) so the owner previews exactly
 *    what they're editing, not a frozen share snapshot;
 *  - never touches share revoke/expiry/view-count.
 *
 * Both paths funnel through `finishViewerDeliverable`, so the viewer model is
 * identical — only the media-URL prefix differs (owner media route vs token route).
 */
export async function loadDeliverableById(
  id: string,
  orgId: string,
): Promise<ViewerDeliverable | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, content, created_by, share_token")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle<{
      id: string;
      title: string | null;
      content: unknown;
      created_by: string;
      share_token: string | null;
    }>();

  if (!data) return null;

  return finishViewerDeliverable(
    admin,
    data,
    (mediaItemId) => `/api/site-walk/deliverables/${id}/media/${mediaItemId}`,
  );
}
