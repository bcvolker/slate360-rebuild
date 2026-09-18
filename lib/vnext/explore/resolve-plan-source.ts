import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { VnextExploreSourceData, VnextExploreSourceSummary } from "@/lib/vnext/explore-types";

type Admin = ReturnType<typeof createAdminClient>;

function hasImage(row: {
  thumbnail_s3_key: unknown;
  rasterized_key: unknown;
  image_s3_key: unknown;
}): boolean {
  return Boolean(row.thumbnail_s3_key || row.rasterized_key || row.image_s3_key);
}

function sheetLabel(row: { sheet_name: unknown; sheet_number: unknown }): string {
  return (row.sheet_name as string | null)?.trim() || `Sheet ${row.sheet_number ?? ""}`.trim();
}

export async function loadPlanSources(admin: Admin, projectId: string): Promise<VnextExploreSourceSummary[]> {
  const { data } = await admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key, updated_at, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  return (data ?? []).filter(hasImage).map((row) => ({
    id: row.id,
    label: sheetLabel(row),
    dateLabel: formatPlainDate(row.updated_at as string | null),
  }));
}

export async function resolvePlanSourceData(
  admin: Admin,
  projectId: string,
  sourceId: string | null,
): Promise<{ sourceId: string; data: VnextExploreSourceData } | null> {
  let query = admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key, sort_order")
    .eq("project_id", projectId);
  query = sourceId ? query.eq("id", sourceId) : query.order("sort_order", { ascending: true }).limit(1);

  const { data } = await query;
  const sheet = (data ?? []).filter(hasImage)[0];
  if (!sheet) return null;
  return {
    sourceId: sheet.id,
    data: {
      kind: "plan",
      imageUrl: `/api/site-walk/plan-sheets/${sheet.id}/image`,
      sheetName: sheetLabel(sheet),
    },
  };
}
