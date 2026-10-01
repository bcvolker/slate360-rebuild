import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { VnextExploreSourceData, VnextExploreSourceSummary } from "@/lib/vnext/explore-types";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";

type Admin = ReturnType<typeof createAdminClient>;

export function planSheetHasImage(row: {
  thumbnail_s3_key: unknown;
  rasterized_key: unknown;
  image_s3_key: unknown;
}): boolean {
  return Boolean(row.thumbnail_s3_key || row.rasterized_key || row.image_s3_key);
}

function sheetLabel(row: { sheet_name: unknown; sheet_number: unknown }): string {
  return (row.sheet_name as string | null)?.trim() || `Sheet ${row.sheet_number ?? ""}`.trim();
}

export async function loadPlanSources(
  admin: Admin,
  projectId: string,
  options?: { includeUnpublished?: boolean },
): Promise<VnextExploreSourceSummary[]> {
  const published = options?.includeUnpublished ? null : publishedIdSet(await readProjectPublications(admin, projectId), projectId, "plans");
  const { data } = await admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key, updated_at, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  return (data ?? []).filter(planSheetHasImage).filter((row) => !published || published.has(row.id)).map((row) => ({
    id: row.id,
    label: sheetLabel(row),
    dateLabel: formatPlainDate(row.updated_at as string | null),
  }));
}

export async function resolvePlanSourceData(
  admin: Admin,
  projectId: string,
  sourceId: string | null,
  options?: { includeUnpublished?: boolean },
): Promise<{ sourceId: string; data: VnextExploreSourceData } | null> {
  const published = options?.includeUnpublished ? null : publishedIdSet(await readProjectPublications(admin, projectId), projectId, "plans");
  let query = admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key, sort_order")
    .eq("project_id", projectId);
  if (sourceId) {
    query = query.eq("id", sourceId);
  } else if (published && published.size === 0) {
    return null;
  } else {
    if (published) query = query.in("id", [...published]);
    query = query.order("sort_order", { ascending: true }).limit(1);
  }

  const { data } = await query;
  const sheet = (data ?? []).filter(planSheetHasImage).find((row) => sourceId && published ? published.has(row.id) : true);
  if (!sheet) return null;
  return {
    sourceId: sheet.id,
    data: {
      kind: "plan",
      // vNext-scoped route (project-access contract), not the legacy punchwalk-gated,
      // single-org route — see resolve-pano-source.ts's identical rationale.
      imageUrl: `/api/vnext/projects/${projectId}/plan-sheets/${sheet.id}/image`,
      sheetName: sheetLabel(sheet),
    },
  };
}
