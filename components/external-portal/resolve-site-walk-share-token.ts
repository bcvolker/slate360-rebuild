/**
 * Server-only helper for /view and /share/deliverable token pages.
 * Does not increment view counts — callers keep existing analytics behavior.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type SiteWalkShareDenyReason =
  | "invalid"
  | "expired"
  | "revoked"
  | "max_views"
  | "unavailable";

export type SiteWalkShareResolveResult =
  | { ok: true }
  | { ok: false; reason: SiteWalkShareDenyReason };

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function resolveSiteWalkShareToken(
  token: string,
): Promise<SiteWalkShareResolveResult> {
  if (!TOKEN_RE.test(token)) {
    return { ok: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("site_walk_deliverables")
    .select(
      "id, status, share_revoked, share_expires_at, share_max_views, share_view_count",
    )
    .eq("share_token", token)
    .maybeSingle();

  if (!row) return { ok: false, reason: "invalid" };
  if (row.share_revoked) return { ok: false, reason: "revoked" };
  if (row.status !== "shared") return { ok: false, reason: "unavailable" };
  if (
    row.share_expires_at &&
    new Date(row.share_expires_at).getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }
  if (
    row.share_max_views !== null &&
    row.share_max_views !== undefined &&
    (row.share_view_count ?? 0) >= row.share_max_views
  ) {
    return { ok: false, reason: "max_views" };
  }

  return { ok: true };
}

export function siteWalkDenyToPortalState(
  reason: SiteWalkShareDenyReason,
): "invalid" | "expired" | "revoked" | "max_views" | "unavailable" {
  return reason;
}
