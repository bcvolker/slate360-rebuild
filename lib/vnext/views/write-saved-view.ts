import "server-only";

import { resolveTwinSourceData } from "@/lib/vnext/explore/resolve-twin-source";
import { resolvePanoSourceData } from "@/lib/vnext/explore/resolve-pano-source";
import { resolvePlanSourceData } from "@/lib/vnext/explore/resolve-plan-source";
import { resolveThermalSourceData } from "@/lib/vnext/explore/resolve-thermal-source";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import { capabilityForRepresentation } from "@/lib/vnext/scope/capabilities";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { readProjectHistory } from "@/lib/vnext/history/read-project-history";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { normalizeSavedViewDraft } from "./normalize-saved-view";
import type { SavedViewDraft, VnextSavedView } from "./saved-view-types";
import { unambiguousVisit, visitMatchesSource } from "./visit-match";

type Admin = any;

async function sourceAllowed(
  admin: Admin,
  projectId: string,
  representation: VnextExploreRepresentation,
  sourceId: string,
): Promise<boolean> {
  if (representation === "reality") return Boolean(await resolveTwinSourceData(admin, projectId, "splat", "Reality", sourceId));
  if (representation === "geometry") return Boolean(await resolveTwinSourceData(admin, projectId, "model", "Geometry", sourceId));
  if (representation === "360") return Boolean(await resolvePanoSourceData(admin, projectId, sourceId));
  if (representation === "plan") return Boolean(await resolvePlanSourceData(admin, projectId, sourceId));
  return Boolean(await resolveThermalSourceData(admin, projectId, sourceId));
}

async function itemAllowed(admin: Admin, projectId: string, itemId: string | null): Promise<boolean> {
  if (!itemId) return true;
  const { data, error } = await admin
    .from("site_walk_items")
    .select("id")
    .eq("id", itemId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  return !error && Boolean(data?.id);
}

export async function createSavedView(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
  draft: SavedViewDraft,
): Promise<{ ok: true; id: string } | { ok: false; reason: "denied" | "hidden" | "invalid" | "error" }> {
  const allowed = await userCanManageVnextProject(admin, userId, projectId, projectOrgId);
  if (!allowed) return { ok: false, reason: "denied" };
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeRepresentation(scope, draft.representation as VnextExploreRepresentation)) {
    return { ok: false, reason: "hidden" };
  }
  const representation = draft.representation as VnextExploreRepresentation;
  if (!capabilityForRepresentation(representation)) return { ok: false, reason: "hidden" };
  let viewState = draft.viewState;
  if (representation === "thermal" && viewState && typeof viewState === "object" && (viewState as { kind?: string }).kind === "thermal") {
    const thermal = await resolveThermalSourceData(admin, projectId, draft.sourceId);
    const captureId = String((viewState as { captureId?: string }).captureId ?? "");
    const known = thermal && thermal.kind === "thermal" && thermal.captures.some((capture) => capture.id === captureId);
    if (!known) viewState = null;
  }
  const sourceOk = await sourceAllowed(admin, projectId, representation, draft.sourceId);
  const itemOk = await itemAllowed(admin, projectId, draft.itemId ?? null);
  const history = await readProjectHistory(admin, projectId, {
    exploreBase: `/vnext/projects/${projectId}/explore`,
    itemsBase: `/vnext/projects/${projectId}/items`,
  });
  let visitId = draft.visitId ?? null;
  let occurredAt = draft.occurredAt ?? null;
  if (!visitId && !history.error) {
    const match = unambiguousVisit(history.visits, draft.sourceId, draft.representation as VnextExploreRepresentation);
    if (match) {
      visitId = match.id;
      occurredAt = match.occurredAt;
    }
  }
  const visitOk =
    !visitId ||
    (!history.error &&
      visitMatchesSource(history.visits, visitId, occurredAt ?? "", draft.sourceId, representation));
  const normalized = normalizeSavedViewDraft(
    { ...draft, viewState, visitId, occurredAt },
    { projectId, sourceAllowed: sourceOk, itemAllowed: itemOk, visitAllowed: visitOk },
  );
  if (!normalized.ok) return { ok: false, reason: "invalid" };
  const value = normalized.value;
  const { data, error } = await admin
    .from("project_saved_views")
    .insert({
      project_id: projectId,
      title: value.title,
      representation: value.representation,
      source_id: value.sourceId,
      visit_id: value.visitId,
      occurred_at: value.occurredAt,
      item_id: value.itemId,
      plan_sheet_id: value.planSheetId,
      view_state: value.viewState ?? {},
      aspect: value.aspect,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data?.id) return { ok: false, reason: "error" };
  return { ok: true, id: String(data.id) };
}

export async function renameSavedView(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
  viewId: string,
  title: string,
): Promise<"ok" | "denied" | "missing" | "invalid" | "error"> {
  const allowed = await userCanManageVnextProject(admin, userId, projectId, projectOrgId);
  if (!allowed) return "denied";
  const next = title.trim().replace(/\s+/g, " ");
  if (!next || next.length > 120) return "invalid";
  const { data, error } = await admin
    .from("project_saved_views")
    .update({ title: next })
    .eq("id", viewId)
    .eq("project_id", projectId)
    .select("id");
  if (error) return "error";
  if (!Array.isArray(data) || data.length === 0) return "missing";
  return "ok";
}

export async function deleteSavedView(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
  viewId: string,
): Promise<"ok" | "denied" | "missing" | "error"> {
  const allowed = await userCanManageVnextProject(admin, userId, projectId, projectOrgId);
  if (!allowed) return "denied";
  const { data, error } = await admin
    .from("project_saved_views")
    .delete()
    .eq("id", viewId)
    .eq("project_id", projectId)
    .select("id");
  if (error) return "error";
  if (!Array.isArray(data) || data.length === 0) return "missing";
  return "ok";
}

export type { VnextSavedView };
