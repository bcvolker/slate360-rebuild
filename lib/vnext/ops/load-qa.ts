import "server-only";

import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { isThermalSessionAvailable, type ThermalCaptureLike, type ThermalShareLike } from "@/lib/vnext/thermal-availability";
import { publishedIdSet, readPublicationsForProjects } from "@/lib/vnext/release/read-publications";
import type { ReviewRecord } from "@/lib/vnext/release/release-rules";
import { classifyQaItem, type QaItem } from "./qa-model";

type Admin = any;

const LOAD_ERROR = "Review records could not be loaded.";

type ProjectRef = { id: string; name: string; included: readonly string[] };

export async function loadQaQueue(admin: Admin, projects: readonly ProjectRef[]): Promise<{ items: QaItem[]; error: string | null }> {
  const ids = projects.map((project) => project.id);
  if (ids.length === 0) return { items: [], error: null };
  const names = new Map(projects.map((project) => [project.id, project]));
  let error: string | null = null;
  const sources: Array<Parameters<typeof classifyQaItem>[0]> = [];

  let publications: Awaited<ReturnType<typeof readPublicationsForProjects>> = [];
  try {
    publications = await readPublicationsForProjects(admin, ids);
  } catch {
    error = LOAD_ERROR;
  }
  const reviews = await admin.from("project_source_reviews").select("project_id, representation, source_id, decision, note, needs_recapture").in("project_id", ids);
  if (reviews.error) error = LOAD_ERROR;
  const reviewByKey = new Map(asRows(reviews.data).map((row) => [key(String(row.project_id), String(row.representation), String(row.source_id)), toReview(row)]));

  const spaces = await admin.from("digital_twin_spaces").select("id, project_id").in("project_id", ids).is("deleted_at", null).neq("status", "archived");
  if (spaces.error) error = LOAD_ERROR;
  const spaceProject = new Map(asRows(spaces.data).map((row) => [String(row.id), String(row.project_id)]));
  const spaceIds = [...spaceProject.keys()];
  if (spaceIds.length > 0) {
    const models = await admin
      .from("digital_twin_models")
      .select("id, space_id, title, version_label, captured_at, created_at, model_format, storage_key, status")
      .in("space_id", spaceIds)
      .eq("status", "ready")
      .is("deleted_at", null);
    if (models.error) error = LOAD_ERROR;
    for (const model of asRows(models.data)) {
      const projectId = spaceProject.get(String(model.space_id ?? ""));
      const project = projectId ? names.get(projectId) : undefined;
      const kind = resolveTwinViewerKind(String(model.model_format ?? ""), String(model.storage_key ?? ""));
      if (!project || (kind !== "splat" && kind !== "model")) continue;
      const representation = kind === "splat" ? "reality" : "geometry";
      sources.push(source(project, representation, String(model.id), String(model.title ?? representationLabelFallback(representation)), stringOrNull(model.version_label), stringOrNull(model.captured_at) ?? stringOrNull(model.created_at), publishedIdSet(publications, project.id, representation).has(String(model.id))));
    }
  }

  const items360 = await admin.from("site_walk_items").select("id, project_id, title, captured_at, s3_key").in("project_id", ids).eq("item_type", "photo_360").is("deleted_at", null);
  if (items360.error) error = LOAD_ERROR;
  for (const item of asRows(items360.data)) {
    const project = names.get(String(item.project_id ?? ""));
    if (!project || !stringOrNull(item.s3_key)) continue;
    sources.push(source(project, "pano360", String(item.id), String(item.title ?? "360 photo"), null, stringOrNull(item.captured_at), publishedIdSet(publications, project.id, "pano360").has(String(item.id))));
  }

  const sheets = await admin.from("site_walk_plan_sheets").select("id, project_id, sheet_name, sheet_number, updated_at, thumbnail_s3_key, rasterized_key, image_s3_key").in("project_id", ids);
  if (sheets.error) error = LOAD_ERROR;
  for (const sheet of asRows(sheets.data)) {
    const project = names.get(String(sheet.project_id ?? ""));
    if (!project || !planSheetHasImage(sheet as { thumbnail_s3_key: unknown; rasterized_key: unknown; image_s3_key: unknown })) continue;
    const label = String(sheet.sheet_name ?? "").trim() || `Sheet ${sheet.sheet_number ?? ""}`.trim();
    sources.push(source(project, "plans", String(sheet.id), label, null, stringOrNull(sheet.updated_at), publishedIdSet(publications, project.id, "plans").has(String(sheet.id))));
  }

  const sessions = await admin.from("thermal_analysis_sessions").select("id, project_id, name, created_at").in("project_id", ids).is("deleted_at", null);
  if (sessions.error) error = LOAD_ERROR;
  const sessionRows = asRows(sessions.data);
  const sessionIds = sessionRows.map((row) => String(row.id));
  let shares: ThermalShareLike[] = [];
  let captures: ThermalCaptureLike[] = [];
  if (sessionIds.length > 0) {
    const shareRows = await admin.from("thermal_analysis_share_tokens").select("id, session_id, is_revoked, expires_at, layer_config").in("session_id", sessionIds);
    const captureRows = await admin.from("thermal_captures").select("id, session_id, preview_path, storage_path").in("session_id", sessionIds).is("deleted_at", null);
    if (shareRows.error || captureRows.error) error = LOAD_ERROR;
    shares = asRows(shareRows.data).map((row) => ({ id: String(row.id), sessionId: String(row.session_id), isRevoked: Boolean(row.is_revoked), expiresAt: stringOrNull(row.expires_at), layerConfig: (row.layer_config as Record<string, unknown> | null) ?? null, brandingSnapshot: null }));
    captures = asRows(captureRows.data).map((row) => ({ id: String(row.id), sessionId: String(row.session_id), previewPath: stringOrNull(row.preview_path), storagePath: stringOrNull(row.storage_path) }));
  }
  for (const session of sessionRows) {
    const project = names.get(String(session.project_id ?? ""));
    if (!project) continue;
    const own = captures.filter((capture) => capture.sessionId === String(session.id));
    if (!own.some((capture) => capture.previewPath || capture.storagePath)) continue;
    const publishedThermal = publishedIdSet(publications, project.id, "thermal");
    sources.push(source(project, "thermal", String(session.id), String(session.name ?? "Thermal"), null, stringOrNull(session.created_at), isThermalSessionAvailable(String(session.id), shares, captures, publishedThermal)));
  }

  const items = sources.flatMap((entry) => {
    const review = reviewByKey.get(key(entry.projectId, entry.representation, entry.sourceId)) ?? null;
    const item = classifyQaItem(entry, review);
    return item ? [item] : [];
  });
  return { items, error };
}

function source(project: ProjectRef, representation: QaItem["representation"], sourceId: string, title: string, version: string | null, occurredAt: string | null, published: boolean): Parameters<typeof classifyQaItem>[0] {
  return {
    projectId: project.id,
    projectName: project.name,
    representation,
    sourceId,
    title,
    version,
    occurredAt,
    included: project.included.includes(representation),
    published,
  };
}

function toReview(row: Record<string, unknown>): ReviewRecord {
  return {
    projectId: String(row.project_id),
    representation: row.representation as ReviewRecord["representation"],
    sourceId: String(row.source_id),
    decision: row.decision === "rejected" ? "rejected" : "approved",
    note: stringOrNull(row.note),
    needsRecapture: row.needs_recapture === true,
  };
}

function representationLabelFallback(representation: "reality" | "geometry"): string {
  return representation === "reality" ? "Reality model" : "Geometry model";
}
function key(projectId: string, representation: string, sourceId: string): string {
  return `${projectId}:${representation}:${sourceId}`;
}
function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}
function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
