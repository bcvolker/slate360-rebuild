import "server-only";

import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import type { VnextSavedView } from "./saved-view-types";

type Admin = any;

function asView(row: Record<string, unknown>): VnextSavedView | null {
  const representation = row.representation;
  if (
    representation !== "reality" &&
    representation !== "geometry" &&
    representation !== "360" &&
    representation !== "plan" &&
    representation !== "thermal"
  ) {
    return null;
  }
  const viewState = row.view_state;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    representation,
    sourceId: String(row.source_id ?? ""),
    visitId: typeof row.visit_id === "string" ? row.visit_id : null,
    occurredAt: typeof row.occurred_at === "string" ? row.occurred_at : null,
    itemId: typeof row.item_id === "string" ? row.item_id : null,
    planSheetId: typeof row.plan_sheet_id === "string" ? row.plan_sheet_id : null,
    viewState:
      viewState && typeof viewState === "object" && "kind" in (viewState as object)
        ? (viewState as VnextSavedView["viewState"])
        : null,
    aspect: row.aspect === "16:9" || row.aspect === "9:16" || row.aspect === "1:1" ? row.aspect : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function readSavedViews(
  admin: Admin,
  projectId: string,
): Promise<{ views: VnextSavedView[]; failed: boolean }> {
  const scope = await readClientScope(admin, projectId);
  const { data, error } = await admin
    .from("project_saved_views")
    .select("id, project_id, title, representation, source_id, visit_id, occurred_at, item_id, plan_sheet_id, view_state, aspect, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !Array.isArray(data)) return { views: [], failed: true };
  const views = data
    .map((row) => asView(row as Record<string, unknown>))
    .filter((view): view is VnextSavedView => Boolean(view && canClientSeeRepresentation(scope, view.representation)));
  return { views, failed: false };
}

export async function readSavedView(admin: Admin, projectId: string, viewId: string): Promise<VnextSavedView | null> {
  const { views, failed } = await readSavedViews(admin, projectId);
  if (failed) return null;
  return views.find((view) => view.id === viewId) ?? null;
}
