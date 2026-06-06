import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TwinShareDenyReason } from "@/lib/digital-twin/share-token";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type TwinShareRole = "view" | "annotate" | "download";

export type TwinShareAnnotateContext = {
  shareTokenId: string;
  token: string;
  role: TwinShareRole;
  orgId: string;
  spaceId: string;
  createdBy: string;
  label: string | null;
};

export type TwinShareAnnotateResult =
  | { ok: true; ctx: TwinShareAnnotateContext }
  | { ok: false; reason: TwinShareDenyReason | "forbidden" };

export async function resolveTwinShareAnnotate(
  token: string,
  options?: { requireAnnotate?: boolean },
): Promise<TwinShareAnnotateResult> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "invalid" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("digital_twin_share_tokens")
    .select("id, token, role, org_id, space_id, created_by, label, is_revoked, expires_at, max_views, view_count")
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

  const role = row.role as TwinShareRole;
  if (options?.requireAnnotate && role !== "annotate") {
    return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    ctx: {
      shareTokenId: row.id,
      token: row.token,
      role,
      orgId: row.org_id,
      spaceId: row.space_id,
      createdBy: row.created_by,
      label: row.label,
    },
  };
}

export function isVec3(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number" &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  );
}
