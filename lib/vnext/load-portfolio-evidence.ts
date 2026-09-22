import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { isThermalSessionAvailable, type ThermalCaptureLike, type ThermalShareLike } from "./thermal-availability";
import type { PortfolioEvidence } from "./portfolio-types";
import { resolveRepresentations } from "./project-hero";
import { applyScopeToEvidence } from "./scope/filter-client-surface";
import { canClientSeeCapability } from "./scope/resolve-client-scope";
import { readClientScopes } from "./scope/read-project-scope";

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
          // vNext-scoped route (project-access contract), not the legacy digital_twin-gated,
          // single-org route — same rationale as the Explore splat proxy.
          evidence.realityPreviewUrl = `/api/vnext/projects/${projectId}/twin-models/${model.id}/preview-image`;
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
  for (const capture of captures) {
    ensure(byId, capture.project_id).timestamps.push(capture.uploaded_at || capture.created_at);
  }

  // digital_twin_capture_assets (panorama_360 / drone_photo / drone_video) is intentionally not
  // queried for representation flags here. A vNext client representation means something the
  // client can actually open and render, not merely a source asset that exists. Confirmed by a
  // Slice 4 audit: there is no GET/image route anywhere under app/api/digital-twin/** that serves
  // a capture asset's storage_key — only a PATCH route that re-tags asset_kind. "360" is correctly
  // flagged below from site_walk_items.photo_360 instead, which has a proven, working image route
  // (/api/site-walk/items/[id]/image). "drone" has no proven viewer at all (Slice 0 salvage audit:
  // "No orthomosaic viewer"). The capture_assets rows themselves are untouched — this only stops
  // them from being reported as an openable representation before a real serving route exists.

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
      // vNext-scoped route (project-access contract), not the legacy punchwalk-gated,
      // single-org route — same rationale as the Explore 360 photo route.
      if (!evidence.pano360Url) evidence.pano360Url = `/api/vnext/projects/${item.project_id}/items/${item.id}/image`;
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
    // vNext-scoped route (project-access contract), not the legacy punchwalk-gated,
    // single-org route — same rationale as the Explore plan-sheet route.
    if (!evidence.planUrl) evidence.planUrl = `/api/vnext/projects/${sheet.project_id}/plan-sheets/${sheet.id}/image`;
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
  // Batched, not per-session: one shares query and one captures query for every project in this
  // call, then the shared isThermalSessionAvailable predicate (lib/vnext/thermal-availability.ts)
  // decides per session — the same predicate resolve-thermal-source.ts uses for Explore, so
  // Overview and Explore cannot drift on what counts as "Thermal available" again.
  let thermalShares: ThermalShareLike[] = [];
  let thermalCaptures: ThermalCaptureLike[] = [];
  if (thermalSessions.length > 0) {
    const sessionIds = thermalSessions.map((row) => row.id);
    const shareRows = await rows<{
      id: string;
      session_id: string;
      is_revoked: boolean;
      expires_at: string | null;
      layer_config: Record<string, unknown> | null;
      branding_snapshot: Record<string, unknown> | null;
    }>(
      admin
        .from("thermal_analysis_share_tokens")
        .select("id, session_id, is_revoked, expires_at, layer_config, branding_snapshot")
        .in("session_id", sessionIds),
    );
    thermalShares = shareRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      isRevoked: row.is_revoked,
      expiresAt: row.expires_at,
      layerConfig: row.layer_config,
      brandingSnapshot: row.branding_snapshot,
    }));

    const captureRows = await rows<{
      id: string;
      session_id: string;
      preview_path: string | null;
      storage_path: string | null;
    }>(
      admin
        .from("thermal_captures")
        .select("id, session_id, preview_path, storage_path")
        .in("session_id", sessionIds)
        .is("deleted_at", null),
    );
    thermalCaptures = captureRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      previewPath: row.preview_path,
      storagePath: row.storage_path,
    }));
  }
  const scopes = await readClientScopes(admin, projectIds);
  for (const session of thermalSessions) {
    if (!session.project_id) continue;
    const evidence = ensure(byId, session.project_id);
    const scope = scopes.get(session.project_id);
    if (!scope || !canClientSeeCapability(scope, "thermal")) continue;
    evidence.timestamps.push(session.updated_at);
    if (isThermalSessionAvailable(session.id, thermalShares, thermalCaptures)) addFlag(evidence, "thermal");
  }

  const result: Record<string, PortfolioEvidence> = {};
  for (const [projectId, evidence] of byId) {
    evidence.representations = resolveRepresentations(
      Object.fromEntries(evidence.representations.map((id) => [id, true])),
    );
    result[projectId] = applyScopeToEvidence(evidence, scopes.get(projectId)!);
  }
  return result;
}
