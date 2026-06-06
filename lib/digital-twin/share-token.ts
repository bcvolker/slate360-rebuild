import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TwinShareDenyReason =
  | "invalid"
  | "expired"
  | "revoked"
  | "max_views";

export type TwinShareResolveResult =
  | { ok: true }
  | { ok: false; reason: TwinShareDenyReason };

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export async function resolveTwinShareToken(
  token: string,
): Promise<TwinShareResolveResult> {
  if (!TOKEN_RE.test(token)) {
    return { ok: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("digital_twin_share_tokens")
    .select("id, is_revoked, expires_at, max_views, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!row) return { ok: false, reason: "invalid" };
  if (row.is_revoked) return { ok: false, reason: "revoked" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    row.max_views !== null &&
    row.max_views !== undefined &&
    row.view_count >= row.max_views
  ) {
    return { ok: false, reason: "max_views" };
  }

  return { ok: true };
}

export function twinShareDenyToPortalState(
  reason: TwinShareDenyReason,
): "invalid" | "expired" | "revoked" | "max_views" {
  return reason;
}

export async function claimTwinShareView(
  token: string,
  viewerIp: string,
  viewerUa: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_digital_twin_share_view", {
    p_token: token,
    p_viewer_ip: viewerIp,
    p_viewer_ua: viewerUa.slice(0, 500),
  });

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
