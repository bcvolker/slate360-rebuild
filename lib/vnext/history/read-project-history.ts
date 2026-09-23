import "server-only";

import { isThermalSessionAvailable, type ThermalCaptureLike, type ThermalShareLike } from "@/lib/vnext/thermal-availability";
import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";
import { HISTORY_LOAD_ERROR } from "./history-types";
import { assembleProjectHistory, type HistoryBuildInput } from "./assemble-history";
import type { VnextVisit } from "./history-types";

type Admin = { from: (table: string) => { select: (columns: string) => unknown } };
type Query = {
  eq: (column: string, value: string) => Query;
  in: (column: string, values: string[]) => Query;
  is: (column: string, value: null) => Query;
  neq: (column: string, value: string) => Query;
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"];
};

function queryOf(admin: Admin, table: string, columns: string): Query {
  return (admin.from(table) as { select: (columns: string) => Query }).select(columns);
}
function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function readProjectHistory(
  admin: Admin,
  projectId: string,
  bases: { exploreBase: string; itemsBase: string },
): Promise<{ visits: VnextVisit[]; error: string | null }> {
  const sessions = await queryOf(admin, "site_walk_sessions", "id, project_id, title, status, completed_at, started_at, created_offline_at, created_at").eq("project_id", projectId);
  if (sessions.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const items = await queryOf(admin, "site_walk_items", "id, project_id, session_id, item_type, title, captured_at, deleted_at").eq("project_id", projectId).is("deleted_at", null);
  if (items.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const spaces = await queryOf(admin, "digital_twin_spaces", "id, project_id, status, deleted_at").eq("project_id", projectId);
  if (spaces.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const spaceIds = rows(spaces.data).map((row) => String(row.id));
  const captures = await queryOf(admin, "digital_twin_captures", "id, project_id, title, uploaded_at, created_at, deleted_at").eq("project_id", projectId).is("deleted_at", null);
  if (captures.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const models = spaceIds.length
    ? await queryOf(admin, "digital_twin_models", "id, space_id, capture_id, model_format, storage_key, title, status, deleted_at, created_at, preview_storage_key, quality_metrics").in("space_id", spaceIds).is("deleted_at", null)
    : { data: [], error: null };
  if (models.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const thermals = await queryOf(admin, "thermal_analysis_sessions", "id, project_id, name, created_at, deleted_at").eq("project_id", projectId).is("deleted_at", null);
  if (thermals.error) return { visits: [], error: HISTORY_LOAD_ERROR };
  const thermalIds = rows(thermals.data).map((row) => String(row.id));
  const shares = thermalIds.length
    ? await queryOf(admin, "thermal_analysis_share_tokens", "id, session_id, is_revoked, expires_at, layer_config").in("session_id", thermalIds)
    : { data: [], error: null };
  const thermalCaptures = thermalIds.length
    ? await queryOf(admin, "thermal_captures", "id, session_id, preview_path, storage_path, created_at, deleted_at").in("session_id", thermalIds).is("deleted_at", null)
    : { data: [], error: null };
  const sheets = await queryOf(admin, "site_walk_plan_sheets", "id, project_id, plan_set_id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key").eq("project_id", projectId);
  const sets = await queryOf(admin, "site_walk_plan_sets", "id, project_id, revision_number, revision_label").eq("project_id", projectId);
  const links = await queryOf(admin, "site_walk_session_plan_sheets", "session_id, plan_sheet_id, project_id").eq("project_id", projectId);
  const pins = await queryOf(admin, "site_walk_pins", "session_id, plan_sheet_id, project_id, x_pct, y_pct").eq("project_id", projectId);
  let publishedReality: Set<string>;
  let publishedGeometry: Set<string>;
  let publishedPano: Set<string>;
  let publishedPlans: Set<string>;
  try {
    const publications = await readProjectPublications(admin, projectId);
    publishedReality = publishedIdSet(publications, projectId, "reality");
    publishedGeometry = publishedIdSet(publications, projectId, "geometry");
    publishedPano = publishedIdSet(publications, projectId, "pano360");
    publishedPlans = publishedIdSet(publications, projectId, "plans");
  } catch {
    return { visits: [], error: HISTORY_LOAD_ERROR };
  }

  const shareLikes: ThermalShareLike[] = rows(shares.data).map((row) => ({
    id: String(row.id),
    sessionId: String(row.session_id),
    isRevoked: Boolean(row.is_revoked),
    expiresAt: (row.expires_at as string | null) ?? null,
    layerConfig: (row.layer_config as Record<string, unknown> | null) ?? null,
    brandingSnapshot: null,
  }));
  const captureLikes: ThermalCaptureLike[] = rows(thermalCaptures.data).map((row) => ({
    id: String(row.id),
    sessionId: String(row.session_id),
    previewPath: (row.preview_path as string | null) ?? null,
    storagePath: (row.storage_path as string | null) ?? null,
  }));
  const setRevision = new Map(rows(sets.data).map((row) => [String(row.id), revisionLabel(row)]));

  const input: HistoryBuildInput = {
    projectId,
    exploreBase: bases.exploreBase,
    itemsBase: bases.itemsBase,
    sessions: rows(sessions.data).map((row) => ({
      id: String(row.id),
      projectId: (row.project_id as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      completedAt: (row.completed_at as string | null) ?? null,
      startedAt: (row.started_at as string | null) ?? null,
      createdOfflineAt: (row.created_offline_at as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    })),
    items: rows(items.data).filter((row) => row.item_type !== "photo_360" || publishedPano.has(String(row.id))).map((row) => ({
      id: String(row.id),
      projectId: (row.project_id as string | null) ?? null,
      sessionId: (row.session_id as string | null) ?? null,
      itemType: (row.item_type as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      capturedAt: (row.captured_at as string | null) ?? null,
      deleted: false,
    })),
    spaces: rows(spaces.data).map((row) => ({
      id: String(row.id),
      projectId: (row.project_id as string | null) ?? null,
      archived: row.status === "archived",
      deleted: row.deleted_at != null,
    })),
    captures: rows(captures.data).map((row) => ({
      id: String(row.id),
      projectId: (row.project_id as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      uploadedAt: (row.uploaded_at as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
      deleted: false,
    })),
    models: rows(models.data).filter((row) => modelIsPublished(row, publishedReality, publishedGeometry)).map((row) => ({
      id: String(row.id),
      spaceId: String(row.space_id ?? ""),
      captureId: (row.capture_id as string | null) ?? null,
      format: String(row.model_format ?? ""),
      storageKey: String(row.storage_key ?? ""),
      title: (row.title as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      deleted: false,
      createdAt: (row.created_at as string | null) ?? null,
      hasPreview: Boolean(row.preview_storage_key),
      georeferenceStatus: georef(row.quality_metrics),
    })),
    thermals: rows(thermals.data).map((row) => ({
      id: String(row.id),
      projectId: (row.project_id as string | null) ?? null,
      name: (row.name as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
      deleted: false,
      available: isThermalSessionAvailable(String(row.id), shareLikes, captureLikes),
      earliestCaptureAt: earliestCapture(String(row.id), rows(thermalCaptures.data)),
    })),
    sheets: rows(sheets.data).filter((row) => publishedPlans.has(String(row.id))).map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id ?? ""),
      planSetId: String(row.plan_set_id ?? ""),
      label: (row.sheet_name as string | null)?.trim() || `Sheet ${row.sheet_number ?? ""}`.trim(),
      revisionLabel: setRevision.get(String(row.plan_set_id ?? "")) ?? null,
      renderable: planSheetHasImage({
        thumbnail_s3_key: row.thumbnail_s3_key,
        rasterized_key: row.rasterized_key,
        image_s3_key: row.image_s3_key,
      }),
    })),
    sessionLinks: rows(links.data).map((row) => ({ sessionId: String(row.session_id), planSheetId: String(row.plan_sheet_id) })),
    pins: rows(pins.data).map((row) => ({
      sessionId: (row.session_id as string | null) ?? null,
      planSheetId: (row.plan_sheet_id as string | null) ?? null,
      projectId: (row.project_id as string | null) ?? null,
      xPct: Number(row.x_pct),
      yPct: Number(row.y_pct),
    })),
  };
  return { visits: assembleProjectHistory(input), error: null };
}

function modelIsPublished(row: Record<string, unknown>, reality: Set<string>, geometry: Set<string>): boolean {
  const id = String(row.id);
  const format = String(row.model_format ?? "").toLowerCase();
  const key = String(row.storage_key ?? "").toLowerCase();
  if (format === "spz" || key.endsWith(".spz")) return reality.has(id);
  if (format === "glb" || format === "gltf" || format === "usdz" || key.endsWith(".glb") || key.endsWith(".gltf")) return geometry.has(id);
  return false;
}

function georef(metrics: unknown): string | null {
  if (!metrics || typeof metrics !== "object") return null;
  const status = (metrics as { georeferenceStatus?: unknown }).georeferenceStatus;
  return typeof status === "string" ? status.toUpperCase() : null;
}

function revisionLabel(row: Record<string, unknown>): string | null {
  const label = (row.revision_label as string | null)?.trim();
  if (label) return label;
  const number = row.revision_number;
  return typeof number === "number" && number > 1 ? `Rev ${number}` : null;
}

function earliestCapture(sessionId: string, captures: Record<string, unknown>[]): string | null {
  const times = captures
    .filter((row) => String(row.session_id) === sessionId && row.created_at)
    .map((row) => String(row.created_at))
    .sort();
  return times[0] ?? null;
}
