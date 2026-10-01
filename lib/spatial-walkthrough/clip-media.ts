import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClipKeys } from "./derivatives";

const BASE =
  "walkthrough_id, proxy_key, poster_key, public_proxy_key, master_key, capture_meta";
const POSTER_EXTRA = "client_poster_key, public_poster_key, poster_meta";

export type ClipMediaRow = ClipKeys & {
  walkthrough_id: string;
  capture_meta?: Record<string, unknown> | null;
};

function missingPosterColumn(message: string | undefined): boolean {
  const text = message ?? "";
  return (
    text.includes("client_poster_key") ||
    text.includes("public_poster_key") ||
    text.includes("poster_meta")
  );
}

export async function loadClipMediaKeys(
  admin: SupabaseClient,
  filters: Record<string, string>,
): Promise<ClipMediaRow | null> {
  let q = admin.from("spatial_clips").select(`${BASE}, ${POSTER_EXTRA}`);
  for (const [column, value] of Object.entries(filters)) q = q.eq(column, value);
  const extra = await q.maybeSingle();
  if (!extra.error && extra.data) return extra.data as ClipMediaRow;
  if (extra.error && !missingPosterColumn(extra.error.message)) return null;

  let fallback = admin.from("spatial_clips").select(BASE);
  for (const [column, value] of Object.entries(filters)) fallback = fallback.eq(column, value);
  const base = await fallback.maybeSingle();
  if (base.error || !base.data) return null;
  return {
    ...(base.data as ClipMediaRow),
    client_poster_key: null,
    public_poster_key: null,
  };
}
