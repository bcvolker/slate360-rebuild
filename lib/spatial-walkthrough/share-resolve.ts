import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifySharePassword } from "@/lib/slatedrop/share-password";
import type { SharePolicy } from "./types";
import { pinVisibleOnPolicy, attachmentVisibleOnPolicy } from "./pins";
import { rulesForPolicy, type RedactionRule } from "./redaction";
import { visibleWaypoints, toWaypoint } from "./waypoints";

export type ResolvedShare = {
  token: string;
  policy: SharePolicy;
  allowDownload: boolean;
  walkthrough: Record<string, unknown>;
  needsPassword: boolean;
};

export async function loadShareRow(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("spatial_share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return { admin, row: data };
}

export function shareDenied(row: {
  is_revoked: boolean;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
} | null): string | null {
  if (!row) return "invalid";
  if (row.is_revoked) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  if (row.max_views != null && row.view_count >= row.max_views) return "max_views";
  return null;
}

export function passwordOk(row: { password_hash: string | null }, password: string | null): boolean {
  if (!row.password_hash) return true;
  if (!password) return false;
  return verifySharePassword(password, row.password_hash);
}

export function filterRuntime(args: {
  policy: SharePolicy;
  waypoints: Record<string, unknown>[];
  pins: Array<Record<string, unknown> & { visibility: string }>;
  attachments: Array<{ pin_id: string; visible_on_public: boolean }>;
  redactions: RedactionRule[];
  clipId: string;
}) {
  const wps = visibleWaypoints(args.waypoints.map(toWaypoint), args.clipId);
  const pins = args.pins.filter((p) => pinVisibleOnPolicy(p.visibility as "client" | "public" | "internal", args.policy));
  const pinIds = new Set(pins.map((p) => String(p.id)));
  const attachments = args.attachments.filter(
    (a) => pinIds.has(a.pin_id) && attachmentVisibleOnPolicy(a.visible_on_public, args.policy),
  );
  return {
    waypoints: wps,
    pins,
    attachments,
    redactions: rulesForPolicy(args.redactions, args.policy),
  };
}
