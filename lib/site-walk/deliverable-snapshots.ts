/**
 * Deliverable version snapshots.
 *
 * A snapshot is an immutable copy of a deliverable's content at a point in time.
 * Sharing a deliverable freezes a snapshot and pins the public link to it, so
 * later edits don't silently change what a recipient already received. Versions
 * are monotonic per deliverable (v1, v2, ...).
 *
 * Uses the (untyped) admin client; the share token / org scope is the caller's
 * responsibility.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

export type DeliverableSnapshot = {
  id: string;
  version_number: number | null;
};

/**
 * Freeze the deliverable's current content into a new versioned snapshot and
 * return it. Returns null if the deliverable can't be read for the given org.
 */
export async function createDeliverableSnapshot(
  admin: Admin,
  params: { deliverableId: string; orgId: string; userId: string },
): Promise<DeliverableSnapshot | null> {
  const { deliverableId, orgId, userId } = params;

  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("title, content, status, deliverable_type")
    .eq("id", deliverableId)
    .eq("org_id", orgId)
    .single();
  if (!del) return null;

  // Retry on the (deliverable_id, version_number) unique constraint so a
  // concurrent writer (e.g. a double-clicked Publish) can't collide.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: last } = await admin
      .from("site_walk_deliverable_snapshots")
      .select("version_number")
      .eq("deliverable_id", deliverableId)
      .not("version_number", "is", null)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion =
      (typeof last?.version_number === "number" ? last.version_number : 0) + 1;

    const { data: snap, error } = await admin
      .from("site_walk_deliverable_snapshots")
      .insert({
        deliverable_id: deliverableId,
        org_id: orgId,
        snapshot_title: del.title ?? "Untitled deliverable",
        snapshot_content: del.content ?? [],
        snapshot_status: del.status,
        snapshot_type: del.deliverable_type,
        version_number: nextVersion,
        created_by: userId,
      })
      .select("id, version_number")
      .single();

    if (!error && snap) {
      return { id: snap.id as string, version_number: snap.version_number as number };
    }
    // 23505 = unique_violation → another writer took this version; recompute + retry.
    if (!error || (error as { code?: string }).code !== "23505") return null;
  }
  return null;
}
