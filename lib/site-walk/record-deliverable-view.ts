import type { SupabaseClient } from "@supabase/supabase-js";
import { recordEvidenceEvent } from "@/lib/site-walk/evidence-events";

/**
 * Record a deliverable view (by share token): log it to
 * site_walk_deliverable_views and bump share_view_count. Best-effort and
 * server-only — the token is the access control. Used by the hosted viewer
 * pages so view analytics + the max-views quota actually move regardless of
 * which viewer URL the recipient opened.
 */
export async function recordDeliverableView(
  admin: SupabaseClient,
  token: string,
  ip: string,
  ua: string,
): Promise<void> {
  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("id, share_view_count, org_id, project_id")
    .eq("share_token", token)
    .maybeSingle();
  if (!del) return;

  await admin.from("site_walk_deliverable_views").insert({
    deliverable_id: del.id as string,
    viewer_ip: ip,
    viewer_ua: ua.slice(0, 500),
  });

  await admin
    .from("site_walk_deliverables")
    .update({ share_view_count: ((del.share_view_count as number | null) ?? 0) + 1 })
    .eq("id", del.id as string);

  // Chain-of-custody: record that the deliverable was viewed by a recipient
  // (no authenticated actor; the token is the access control). Best-effort.
  const orgId = del.org_id as string | null;
  if (orgId) {
    await recordEvidenceEvent({
      admin,
      orgId,
      projectId: (del.project_id as string | null) ?? null,
      entityType: "site_walk_deliverable",
      entityId: del.id as string,
      eventType: "deliverable_viewed",
      metadata: { viewer_ua: ua.slice(0, 120) },
    });
  }
}
