import "server-only";

import type { VnextClientDocument } from "@/lib/vnext/documents/document-types";
import { assembleProjectPlans, type PlanSetRow, type PlanSheetRow } from "./assemble-plans";
import type { VnextProjectPlanSet } from "./plan-types";

type Admin = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

type Query = {
  eq: (column: string, value: string) => Query;
  order: (column: string, options: { ascending: boolean }) => Query;
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"];
};

function queryOf(admin: Admin, table: string, columns: string): Query {
  return (admin.from(table) as { select: (columns: string) => Query }).select(columns);
}

function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function readProjectPlans(
  admin: Admin,
  projectId: string,
  args: {
    documents: VnextClientDocument[];
    documentsBase: string;
    exploreBase: string;
  },
): Promise<VnextProjectPlanSet[]> {
  const setsResult = await queryOf(
    admin,
    "site_walk_plan_sets",
    "id, project_id, title, kind, revision_number, revision_label, processing_status, source_file_id",
  )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (setsResult.error) return [];

  const sheetsResult = await queryOf(
    admin,
    "site_walk_plan_sheets",
    "id, project_id, plan_set_id, sheet_name, sheet_number, sort_order, thumbnail_s3_key, rasterized_key, image_s3_key",
  )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (sheetsResult.error) return [];

  const sets: PlanSetRow[] = asRows(setsResult.data).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    title: String(row.title ?? ""),
    kind: (row.kind as string | null) ?? null,
    revisionNumber: typeof row.revision_number === "number" ? row.revision_number : null,
    revisionLabel: (row.revision_label as string | null) ?? null,
    processingStatus: (row.processing_status as string | null) ?? null,
    sourceFileId: (row.source_file_id as string | null) ?? null,
    archived: row.processing_status === "archived",
  }));
  const sheets: PlanSheetRow[] = asRows(sheetsResult.data).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    planSetId: String(row.plan_set_id ?? ""),
    sheetName: (row.sheet_name as string | null) ?? null,
    sheetNumber: typeof row.sheet_number === "number" ? row.sheet_number : null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
    thumbnailKey: row.thumbnail_s3_key,
    rasterizedKey: row.rasterized_key,
    imageKey: row.image_s3_key,
  }));

  return assembleProjectPlans(projectId, sets, sheets, args.documents, args.documentsBase, args.exploreBase);
}
