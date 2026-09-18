import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { VnextExploreSourceData, VnextExploreSourceSummary } from "@/lib/vnext/explore-types";

type Admin = ReturnType<typeof createAdminClient>;

/** Proven client-renderable 360 source: site_walk_items.photo_360 (/api/site-walk/items/[id]/image).
 *  digital_twin_capture_assets.panorama_360 is deliberately NOT used here — no serving route exists
 *  for that table (see lib/vnext/load-portfolio-evidence.ts for the same decision). */
export async function loadPanoSources(admin: Admin, projectId: string): Promise<VnextExploreSourceSummary[]> {
  const { data } = await admin
    .from("site_walk_items")
    .select("id, title, captured_at")
    .eq("project_id", projectId)
    .eq("item_type", "photo_360")
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    label: (row.title as string | null)?.trim() || "360 photo",
    dateLabel: formatPlainDate(row.captured_at as string | null),
  }));
}

export async function resolvePanoSourceData(
  admin: Admin,
  projectId: string,
  sourceId: string | null,
): Promise<{ sourceId: string; data: VnextExploreSourceData } | null> {
  let query = admin
    .from("site_walk_items")
    .select("id, title, captured_at")
    .eq("project_id", projectId)
    .eq("item_type", "photo_360")
    .is("deleted_at", null);
  query = sourceId ? query.eq("id", sourceId) : query.order("captured_at", { ascending: false }).limit(1);

  const { data } = await query;
  const item = (data ?? [])[0];
  if (!item) return null;
  return {
    sourceId: item.id,
    data: {
      kind: "360",
      imageUrl: `/api/site-walk/items/${item.id}/image`,
      title: (item.title as string | null)?.trim() || "360 photo",
    },
  };
}
