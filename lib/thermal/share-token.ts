import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ThermalShareDenyReason = "invalid" | "expired" | "revoked" | "max_views";

export type ThermalShareResolveResult =
  | { ok: true; requiresPassword: boolean; role: string }
  | { ok: false; reason: ThermalShareDenyReason };

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export async function resolveThermalShareToken(token: string): Promise<ThermalShareResolveResult> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "invalid" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("thermal_analysis_share_tokens")
    .select("id, is_revoked, expires_at, max_views, view_count, password_hash, role")
    .eq("token", token)
    .maybeSingle();

  if (!row) return { ok: false, reason: "invalid" };
  if (row.is_revoked) return { ok: false, reason: "revoked" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (row.max_views !== null && row.max_views !== undefined && row.view_count >= row.max_views) {
    return { ok: false, reason: "max_views" };
  }

  return {
    ok: true,
    requiresPassword: Boolean(row.password_hash),
    role: row.role ?? "view",
  };
}

export function thermalShareDenyToPortalState(
  reason: ThermalShareDenyReason,
): "invalid" | "expired" | "revoked" | "max_views" {
  return reason;
}

export async function claimThermalShareView(token: string, viewerIp: string, viewerUa: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_thermal_share_view", {
    p_token: token,
    p_viewer_ip: viewerIp,
    p_viewer_ua: viewerUa.slice(0, 500),
  });

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function getThermalSharePasswordHash(token: string): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("thermal_analysis_share_tokens")
    .select("password_hash")
    .eq("token", token)
    .maybeSingle();
  return row?.password_hash ?? null;
}

export async function getLatestThermalReportForSession(sessionId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("thermal_analysis_reports")
    .select("id, title, storage_key, html_storage_key, generated_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return row;
}
