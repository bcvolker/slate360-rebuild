import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeVisualPairs } from "@/lib/thermal/pair-visual";

/**
 * Recomputes thermal↔visual pairing for a whole session and writes
 * `metadata.visual_pair_id` on each matched capture. Idempotent: clears stale
 * links and re-derives from current filenames. Returns the number of links set.
 */
export async function applyVisualPairs(
  admin: SupabaseClient,
  sessionId: string,
  orgId: string,
): Promise<number> {
  const { data: captures, error } = await admin
    .from("thermal_captures")
    .select("id, filename, metadata")
    .eq("session_id", sessionId)
    .eq("org_id", orgId)
    .is("deleted_at", null);
  if (error || !captures?.length) return 0;

  const assignments = computeVisualPairs(
    captures.map((c) => ({ id: c.id as string, filename: (c.filename as string | null) ?? null })),
  );
  const pairMap = new Map(assignments.map((a) => [a.captureId, a.visualPairId]));

  let linked = 0;
  for (const c of captures) {
    const id = c.id as string;
    const meta = { ...((c.metadata as Record<string, unknown> | null) ?? {}) };
    const next = pairMap.get(id) ?? null;
    const current = (meta.visual_pair_id as string | null) ?? null;
    if (current === next) {
      if (next) linked += 1;
      continue; // no change
    }
    meta.visual_pair_id = next;
    const { error: updateError } = await admin
      .from("thermal_captures")
      .update({ metadata: meta })
      .eq("id", id);
    if (!updateError && next) linked += 1;
  }
  return linked;
}
