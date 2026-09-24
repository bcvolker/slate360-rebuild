import "server-only";

import type { VnextSavedView } from "@/lib/vnext/views/saved-view-types";
import { isShareToken, type ShareLinkRecord, type ShareTarget } from "./share-rules";

type Admin = any;

function asRecord(row: Record<string, unknown> | null): ShareLinkRecord | null {
  if (!row) return null;
  const target = row.target_type;
  if (target !== "project" && target !== "saved_view") return null;
  return {
    id: String(row.id),
    token: String(row.token),
    projectId: String(row.project_id),
    targetType: target,
    savedViewId: typeof row.saved_view_id === "string" ? row.saved_view_id : null,
    label: typeof row.label === "string" ? row.label : null,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    isRevoked: row.is_revoked === true,
    viewCount: typeof row.view_count === "number" ? row.view_count : 0,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function asView(row: Record<string, unknown> | null): VnextSavedView | null {
  if (!row) return null;
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

const LINK_COLUMNS =
  "id, token, project_id, target_type, saved_view_id, label, expires_at, is_revoked, view_count, created_at";

export async function readShareByToken(admin: Admin, token: string): Promise<ShareLinkRecord | null> {
  if (!isShareToken(token)) return null;
  const { data } = await admin.from("project_share_links").select(LINK_COLUMNS).eq("token", token).maybeSingle();
  return asRecord(data);
}

export async function claimShareOpen(admin: Admin, token: string): Promise<boolean> {
  if (!isShareToken(token)) return false;
  const { data, error } = await admin.rpc("claim_project_share_open", { p_token: token });
  if (error) return false;
  return data === true;
}

export async function listShareLinks(admin: Admin, projectIds: string[]): Promise<ShareLinkRecord[]> {
  if (projectIds.length === 0) return [];
  const { data } = await admin
    .from("project_share_links")
    .select(LINK_COLUMNS)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
}

export async function insertShareLink(
  admin: Admin,
  row: {
    token: string;
    projectId: string;
    targetType: ShareTarget;
    savedViewId: string | null;
    createdBy: string;
    label: string | null;
    expiresAt: string | null;
  },
): Promise<ShareLinkRecord | null> {
  const { data, error } = await admin
    .from("project_share_links")
    .insert({
      token: row.token,
      project_id: row.projectId,
      target_type: row.targetType,
      saved_view_id: row.savedViewId,
      created_by: row.createdBy,
      label: row.label,
      expires_at: row.expiresAt,
    })
    .select(LINK_COLUMNS)
    .single();
  if (error) return null;
  return asRecord(data);
}

export async function revokeShareLink(admin: Admin, linkId: string, projectIds: string[]): Promise<boolean> {
  if (!linkId || projectIds.length === 0) return false;
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("project_share_links")
    .update({ is_revoked: true, revoked_at: now, updated_at: now })
    .eq("id", linkId)
    .in("project_id", projectIds)
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function readSavedView(admin: Admin, viewId: string): Promise<VnextSavedView | null> {
  const { data } = await admin.from("project_saved_views").select("*").eq("id", viewId).maybeSingle();
  return asView(data);
}

export async function listSavedViewChoices(
  admin: Admin,
  projectIds: string[],
): Promise<Array<{ id: string; projectId: string; title: string }>> {
  if (projectIds.length === 0) return [];
  const { data } = await admin
    .from("project_saved_views")
    .select("id, project_id, title")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<{ id: string; project_id: string; title: string }>).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
  }));
}
