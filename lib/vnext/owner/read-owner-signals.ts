import "server-only";

import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { pickLatestIso } from "@/lib/vnext/project-hero";
import { isThermalSessionAvailable, type ThermalCaptureLike, type ThermalShareLike } from "@/lib/vnext/thermal-availability";
import { publishedIdSet, readPublicationsForProjects } from "@/lib/vnext/release/read-publications";
import type { OwnerFailureFact, OwnerPresence } from "./owner-types";
import { emptyPresence } from "./owner-types";

type Admin = any;

export type OwnerSignals = {
  failures: OwnerFailureFact[];
  internal: Record<string, OwnerPresence>;
  clientVisible: Record<string, OwnerPresence>;
  documentedAt: Record<string, string | null>;
  thumbnailUrl: Record<string, string | null>;
};

async function rows<T>(query: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const { data } = await query;
  return data ?? [];
}

function presence(map: Record<string, OwnerPresence>, projectId: string): OwnerPresence {
  const current = map[projectId];
  if (current) return current;
  const created = emptyPresence();
  map[projectId] = created;
  return created;
}

export async function readOwnerSignals(admin: Admin, projectIds: string[]): Promise<OwnerSignals> {
  const empty: OwnerSignals = { failures: [], internal: {}, clientVisible: {}, documentedAt: {}, thumbnailUrl: {} };
  if (projectIds.length === 0) return empty;

  const [failedCaptures, captureDates, failedPlans, failedThermal, spaces, items, sheets, thermalSessions] = await Promise.all([
    rows<{ id: string; project_id: string; title: string | null; uploaded_at: string | null; created_at: string }>(
      admin.from("digital_twin_captures").select("id, project_id, title, uploaded_at, created_at").in("project_id", projectIds).eq("capture_status", "failed").is("deleted_at", null),
    ),
    rows<{ project_id: string; uploaded_at: string | null; created_at: string }>(
      admin.from("digital_twin_captures").select("project_id, uploaded_at, created_at").in("project_id", projectIds).is("deleted_at", null),
    ),
    rows<{ id: string; project_id: string; title: string | null; created_at: string }>(
      admin.from("site_walk_plan_sets").select("id, project_id, title, created_at").in("project_id", projectIds).eq("processing_status", "failed"),
    ),
    rows<{ id: string; project_id: string | null; name: string | null; created_at: string }>(
      admin.from("thermal_analysis_sessions").select("id, project_id, name, created_at").in("project_id", projectIds).eq("status", "failed").is("deleted_at", null),
    ),
    rows<{ id: string; project_id: string }>(
      admin.from("digital_twin_spaces").select("id, project_id").in("project_id", projectIds).is("deleted_at", null).neq("status", "archived"),
    ),
    rows<{ id: string; project_id: string | null; item_type: string; s3_key: string | null; captured_at: string | null }>(
      admin.from("site_walk_items").select("id, project_id, item_type, s3_key, captured_at").in("project_id", projectIds).is("deleted_at", null),
    ),
    rows<{ id: string; project_id: string; thumbnail_s3_key: string | null; rasterized_key: string | null; image_s3_key: string | null }>(
      admin.from("site_walk_plan_sheets").select("id, project_id, thumbnail_s3_key, rasterized_key, image_s3_key").in("project_id", projectIds),
    ),
    rows<{ id: string; project_id: string | null; created_at: string }>(
      admin.from("thermal_analysis_sessions").select("id, project_id, created_at").in("project_id", projectIds).is("deleted_at", null),
    ),
  ]);

  const failures: OwnerFailureFact[] = [
    ...failedCaptures.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      kind: "capture" as const,
      title: row.title?.trim() || "",
      occurredAt: row.uploaded_at || row.created_at,
    })),
    ...failedPlans.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      kind: "plan" as const,
      title: row.title?.trim() || "",
      occurredAt: row.created_at,
    })),
    ...failedThermal.flatMap((row) =>
      row.project_id
        ? [{ id: row.id, projectId: row.project_id, kind: "thermal" as const, title: row.name?.trim() || "", occurredAt: row.created_at }]
        : [],
    ),
  ];

  const internal: Record<string, OwnerPresence> = {};
  const clientVisible: Record<string, OwnerPresence> = {};
  const dates: Record<string, string[]> = {};
  const pushDate = (projectId: string, iso: string | null | undefined) => {
    if (!iso) return;
    const list = dates[projectId] ?? [];
    list.push(iso);
    dates[projectId] = list;
  };

  let publications: Awaited<ReturnType<typeof readPublicationsForProjects>> = [];
  try {
    publications = await readPublicationsForProjects(admin, projectIds);
  } catch {
    publications = [];
  }
  const spaceToProject = new Map(spaces.map((space) => [space.id, space.project_id]));
  if (spaces.length > 0) {
    const models = await rows<{ id: string; space_id: string; model_format: string | null; storage_key: string | null; preview_storage_key: string | null }>(
      admin.from("digital_twin_models").select("id, space_id, model_format, storage_key, preview_storage_key, status").in("space_id", spaces.map((space) => space.id)).is("deleted_at", null).eq("status", "ready"),
    );
    for (const model of models) {
      const projectId = spaceToProject.get(model.space_id);
      if (!projectId) continue;
      const kind = resolveTwinViewerKind(model.model_format ?? "", model.storage_key ?? "");
      if (kind === "splat") {
        presence(internal, projectId).reality = true;
        if (publishedIdSet(publications, projectId, "reality").has(model.id)) presence(clientVisible, projectId).reality = true;
      }
      if (kind === "model") {
        presence(internal, projectId).geometry = true;
        if (publishedIdSet(publications, projectId, "geometry").has(model.id)) presence(clientVisible, projectId).geometry = true;
      }
      if (kind === "splat" && model.preview_storage_key && !empty.thumbnailUrl[projectId]) {
        empty.thumbnailUrl[projectId] = `/api/vnext/projects/${projectId}/twin-models/${model.id}/preview-image`;
      }
    }
  }

  for (const item of items) {
    if (!item.project_id) continue;
    pushDate(item.project_id, item.captured_at);
    if (item.item_type === "photo_360" && item.s3_key) {
      presence(internal, item.project_id).pano360 = true;
      if (publishedIdSet(publications, item.project_id, "pano360").has(item.id)) presence(clientVisible, item.project_id).pano360 = true;
    }
  }
  for (const sheet of sheets) {
    if (!(sheet.thumbnail_s3_key || sheet.rasterized_key || sheet.image_s3_key)) continue;
    presence(internal, sheet.project_id).plans = true;
    if (publishedIdSet(publications, sheet.project_id, "plans").has(sheet.id)) presence(clientVisible, sheet.project_id).plans = true;
  }
  for (const capture of captureDates) pushDate(capture.project_id, capture.uploaded_at || capture.created_at);

  let shares: ThermalShareLike[] = [];
  let captures: ThermalCaptureLike[] = [];
  if (thermalSessions.length > 0) {
    const sessionIds = thermalSessions.map((row) => row.id);
    const shareRows = await rows<{ id: string; session_id: string; is_revoked: boolean; expires_at: string | null; layer_config: Record<string, unknown> | null }>(
      admin.from("thermal_analysis_share_tokens").select("id, session_id, is_revoked, expires_at, layer_config").in("session_id", sessionIds),
    );
    shares = shareRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      isRevoked: row.is_revoked,
      expiresAt: row.expires_at,
      layerConfig: row.layer_config,
      brandingSnapshot: null,
    }));
    const captureRows = await rows<{ id: string; session_id: string; preview_path: string | null; storage_path: string | null }>(
      admin.from("thermal_captures").select("id, session_id, preview_path, storage_path").in("session_id", sessionIds).is("deleted_at", null),
    );
    captures = captureRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      previewPath: row.preview_path,
      storagePath: row.storage_path,
    }));
  }
  for (const session of thermalSessions) {
    if (!session.project_id) continue;
    const own = captures.filter((capture) => capture.sessionId === session.id);
    if (own.some((capture) => capture.previewPath || capture.storagePath)) presence(internal, session.project_id).thermal = true;
    if (isThermalSessionAvailable(session.id, shares, captures, publishedIdSet(publications, session.project_id, "thermal"))) {
      presence(clientVisible, session.project_id).thermal = true;
    }
  }

  const documentedAt: Record<string, string | null> = {};
  for (const projectId of projectIds) documentedAt[projectId] = pickLatestIso(dates[projectId] ?? []);
  return { failures, internal, clientVisible, documentedAt, thumbnailUrl: empty.thumbnailUrl };
}
