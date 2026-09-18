import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { PortfolioEvidence } from "./portfolio-types";
import { resolveRepresentations } from "./project-hero";

type Admin = ReturnType<typeof createAdminClient>;

function emptyEvidence(): PortfolioEvidence {
  return {
    realityPreviewUrl: null,
    pano360Url: null,
    droneUrl: null,
    planUrl: null,
    timestamps: [],
    representations: [],
  };
}

function ensure(map: Map<string, PortfolioEvidence>, projectId: string): PortfolioEvidence {
  const current = map.get(projectId);
  if (current) return current;
  const created = emptyEvidence();
  map.set(projectId, created);
  return created;
}

function addFlag(evidence: PortfolioEvidence, flag: PortfolioEvidence["representations"][number]) {
  if (!evidence.representations.includes(flag)) evidence.representations.push(flag);
}

async function rows<T>(query: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const { data } = await query;
  return data ?? [];
}

export async function loadPortfolioEvidence(
  admin: Admin,
  projectIds: string[],
): Promise<Record<string, PortfolioEvidence>> {
  const byId = new Map<string, PortfolioEvidence>();
  if (projectIds.length === 0) return {};

  const spaces = await rows<{ id: string; project_id: string; updated_at: string }>(
    admin
      .from("digital_twin_spaces")
      .select("id, project_id, updated_at")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .neq("status", "archived"),
  );
  const spaceToProject = new Map(spaces.map((space) => [space.id, space.project_id]));
  for (const space of spaces) ensure(byId, space.project_id).timestamps.push(space.updated_at);

  if (spaces.length > 0) {
    const models = await rows<{
      id: string;
      space_id: string;
      model_format: string;
      storage_key: string;
      preview_storage_key: string | null;
    }>(
      admin
        .from("digital_twin_models")
        .select("id, space_id, model_format, storage_key, preview_storage_key, status")
        .in("space_id", spaces.map((space) => space.id))
        .is("deleted_at", null)
        .eq("status", "ready"),
    );
    for (const model of models) {
      const projectId = spaceToProject.get(model.space_id);
      if (!projectId) continue;
      const evidence = ensure(byId, projectId);
      const kind = resolveTwinViewerKind(model.model_format ?? "", model.storage_key ?? "");
      if (kind === "splat") {
        addFlag(evidence, "reality");
        if (!evidence.realityPreviewUrl && model.preview_storage_key) {
          evidence.realityPreviewUrl = `/api/digital-twin/models/${model.id}/preview-image`;
        }
      }
      if (kind === "model") addFlag(evidence, "geometry");
    }
  }

  const captures = await rows<{
    id: string;
    project_id: string;
    uploaded_at: string | null;
    created_at: string;
  }>(
    admin
      .from("digital_twin_captures")
      .select("id, project_id, uploaded_at, created_at")
      .in("project_id", projectIds)
      .is("deleted_at", null),
  );
  const captureToProject = new Map(captures.map((row) => [row.id, row.project_id]));
  for (const capture of captures) {
    ensure(byId, capture.project_id).timestamps.push(capture.uploaded_at || capture.created_at);
  }

  if (captures.length > 0) {
    const assets = await rows<{
      capture_id: string;
      asset_kind: string;
      storage_key: string | null;
    }>(
      admin
        .from("digital_twin_capture_assets")
        .select("capture_id, asset_kind, storage_key, status")
        .in("capture_id", captures.map((row) => row.id))
        .is("deleted_at", null),
    );
    for (const asset of assets) {
      const projectId = captureToProject.get(asset.capture_id);
      if (!projectId || !asset.storage_key) continue;
      const evidence = ensure(byId, projectId);
      if (asset.asset_kind === "panorama_360") addFlag(evidence, "360");
      if (asset.asset_kind === "drone_photo" || asset.asset_kind === "drone_video") {
        addFlag(evidence, "drone");
      }
    }
  }

  const items = await rows<{
    id: string;
    project_id: string | null;
    item_type: string;
    s3_key: string | null;
    captured_at: string | null;
  }>(
    admin
      .from("site_walk_items")
      .select("id, project_id, item_type, s3_key, captured_at")
      .in("project_id", projectIds)
      .is("deleted_at", null),
  );
  for (const item of items) {
    if (!item.project_id) continue;
    const evidence = ensure(byId, item.project_id);
    if (item.captured_at) evidence.timestamps.push(item.captured_at);
    if (item.item_type === "photo_360" && item.s3_key) {
      addFlag(evidence, "360");
      if (!evidence.pano360Url) evidence.pano360Url = `/api/site-walk/items/${item.id}/image`;
    }
  }

  const sessions = await rows<{
    project_id: string;
    started_at: string | null;
    completed_at: string | null;
    updated_at: string | null;
  }>(
    admin
      .from("site_walk_sessions")
      .select("project_id, started_at, completed_at, updated_at, status")
      .in("project_id", projectIds)
      .neq("status", "archived"),
  );
  for (const session of sessions) {
    ensure(byId, session.project_id).timestamps.push(
      session.completed_at || session.started_at || session.updated_at || "",
    );
  }

  const sheets = await rows<{
    id: string;
    project_id: string;
    thumbnail_s3_key: string | null;
    rasterized_key: string | null;
    image_s3_key: string | null;
  }>(
    admin
      .from("site_walk_plan_sheets")
      .select("id, project_id, thumbnail_s3_key, rasterized_key, image_s3_key")
      .in("project_id", projectIds),
  );
  for (const sheet of sheets) {
    if (!sheet.thumbnail_s3_key && !sheet.rasterized_key && !sheet.image_s3_key) continue;
    const evidence = ensure(byId, sheet.project_id);
    addFlag(evidence, "plan");
    if (!evidence.planUrl) evidence.planUrl = `/api/site-walk/plan-sheets/${sheet.id}/image`;
  }

  const thermalSessions = await rows<{
    id: string;
    project_id: string | null;
    updated_at: string;
  }>(
    admin
      .from("thermal_analysis_sessions")
      .select("id, project_id, updated_at")
      .in("project_id", projectIds)
      .is("deleted_at", null),
  );
  const publishedThermal = new Set<string>();
  if (thermalSessions.length > 0) {
    const shares = await rows<{ session_id: string; is_revoked: boolean }>(
      admin
        .from("thermal_analysis_share_tokens")
        .select("session_id, is_revoked")
        .in("session_id", thermalSessions.map((row) => row.id)),
    );
    for (const share of shares) {
      if (!share.is_revoked) publishedThermal.add(share.session_id);
    }
  }
  for (const session of thermalSessions) {
    if (!session.project_id) continue;
    const evidence = ensure(byId, session.project_id);
    evidence.timestamps.push(session.updated_at);
    if (publishedThermal.has(session.id)) addFlag(evidence, "thermal");
  }

  const result: Record<string, PortfolioEvidence> = {};
  for (const [projectId, evidence] of byId) {
    evidence.representations = resolveRepresentations(
      Object.fromEntries(evidence.representations.map((id) => [id, true])),
    );
    result[projectId] = evidence;
  }
  return result;
}
