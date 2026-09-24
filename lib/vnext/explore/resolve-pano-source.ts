import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { VnextExploreSourceData, VnextExploreSourceSummary } from "@/lib/vnext/explore-types";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";

type Admin = ReturnType<typeof createAdminClient>;

/** Proven client-renderable 360 source: site_walk_items.photo_360, served through the vNext-scoped
 *  /api/vnext/projects/[projectId]/items/[itemId]/image route (project-access contract — see
 *  lib/server/api-auth.ts withProjectAuth), NOT the legacy /api/site-walk/items/[id]/image route,
 *  which gates on the punchwalk standalone-app entitlement and a single-org match and would wrongly
 *  refuse a project_members collaborator whose access comes from a different org.
 *  digital_twin_capture_assets.panorama_360 is deliberately NOT used here — no serving route exists
 *  for that table (see lib/vnext/load-portfolio-evidence.ts for the same decision). */
export async function loadPanoSources(
  admin: Admin,
  projectId: string,
  options?: { includeUnpublished?: boolean },
): Promise<VnextExploreSourceSummary[]> {
  const published = options?.includeUnpublished ? null : publishedIdSet(await readProjectPublications(admin, projectId), projectId, "pano360");
  const { data } = await admin
    .from("site_walk_items")
    .select("id, title, captured_at")
    .eq("project_id", projectId)
    .eq("item_type", "photo_360")
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });

  return (data ?? []).filter((row) => !published || published.has(row.id)).map((row) => ({
    id: row.id,
    label: (row.title as string | null)?.trim() || "360 photo",
    dateLabel: formatPlainDate(row.captured_at as string | null),
  }));
}

export async function resolvePanoSourceData(
  admin: Admin,
  projectId: string,
  sourceId: string | null,
  options?: { includeUnpublished?: boolean },
): Promise<{ sourceId: string; data: VnextExploreSourceData } | null> {
  const published = options?.includeUnpublished ? null : publishedIdSet(await readProjectPublications(admin, projectId), projectId, "pano360");
  let query = admin
    .from("site_walk_items")
    .select("id, title, captured_at")
    .eq("project_id", projectId)
    .eq("item_type", "photo_360")
    .is("deleted_at", null);
  if (sourceId) {
    query = query.eq("id", sourceId);
  } else if (published && published.size === 0) {
    return null;
  } else {
    if (published) query = query.in("id", [...published]);
    query = query.order("captured_at", { ascending: false, nullsFirst: false }).limit(1);
  }

  const { data } = await query;
  const item = (data ?? []).find((row) => sourceId && published ? published.has(row.id) : true);
  if (!item) return null;
  return {
    sourceId: item.id,
    data: {
      kind: "360",
      imageUrl: `/api/vnext/projects/${projectId}/items/${item.id}/image`,
      title: (item.title as string | null)?.trim() || "360 photo",
    },
  };
}
