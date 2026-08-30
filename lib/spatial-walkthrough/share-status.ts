import type { ShareStatus } from "./types";

export function shareStatusFromRows(
  rows: Array<{ is_revoked: boolean; expires_at: string | null }>,
  now = Date.now(),
): ShareStatus {
  if (rows.length === 0) return "unshared";
  const live = rows.some((r) => !r.is_revoked && (!r.expires_at || new Date(r.expires_at).getTime() > now));
  if (live) return "live";
  if (rows.every((r) => r.is_revoked)) return "revoked";
  return "expired";
}

export function shareStatusLabel(status: string | undefined): string {
  if (status === "live") return "Shared";
  if (status === "expired") return "Expired";
  if (status === "revoked") return "Revoked";
  return "Unshared";
}
