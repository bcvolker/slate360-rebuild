import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifySharePassword } from "@/lib/slatedrop/share-password";
import type { SharePolicy } from "./types";
import { hashShareToken } from "./share-token";

export type ShareRow = {
  id: string;
  token: string | null;
  token_hash: string | null;
  org_id: string;
  walkthrough_id: string;
  policy: SharePolicy;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  allow_download: boolean;
  is_revoked: boolean;
  branding_snapshot: unknown;
  chapter_id?: string | null;
};

export async function loadShareRow(token: string): Promise<{ admin: ReturnType<typeof createAdminClient>; row: ShareRow | null }> {
  const admin = createAdminClient();
  const hash = hashShareToken(token);
  const byHash = await admin.from("spatial_share_tokens").select("*").eq("token_hash", hash).maybeSingle();
  if (byHash.data) return { admin, row: byHash.data as ShareRow };
  const legacy = await admin.from("spatial_share_tokens").select("*").eq("token", token).maybeSingle();
  return { admin, row: (legacy.data as ShareRow | null) ?? null };
}

export { shareDenied } from "./share-token";

export function passwordOk(row: { password_hash: string | null }, password: string | null): boolean {
  if (!row.password_hash) return true;
  if (!password) return false;
  return verifySharePassword(password, row.password_hash);
}

export { filterRuntime } from "./runtime-filter";
