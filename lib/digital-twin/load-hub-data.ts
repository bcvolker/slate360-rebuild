import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { resolveTwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";
import { resolveTwinHubState } from "@/lib/digital-twin/twin-hub-state";
import { readPosterRef } from "@/lib/twin/capture-summary";

type SpaceRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  updated_at: string;
  settings?: unknown;
  projects?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
};

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

const EMPTY: { twins: HubTwin[]; projects: HubTwinProject[] } = {
  twins: [],
  projects: [],
};

export async function loadDigitalTwinHubData(
  orgId: string | null,
): Promise<{ twins: HubTwin[]; projects: HubTwinProject[] }> {
  if (!orgId) return EMPTY;

  const admin = createAdminClient();

  const [spacesResult, projectsResult, jobsResult, capturesResult, modelsResult] = await Promise.all([
    admin
      .from("digital_twin_spaces")
      .select("id, title, status, project_id, updated_at, settings, projects(name)")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(200),
    admin
      .from("projects")
      .select("id, name, status, created_at")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("digital_twin_processing_jobs")
      .select("space_id, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("digital_twin_captures")
      .select("space_id, capture_status")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .limit(1000),
    admin
      .from("digital_twin_models")
      .select("space_id")
      .eq("org_id", orgId)
      .eq("status", "ready")
      .limit(1000),
  ]);

  if (spacesResult.error) {
    return {
      twins: [],
      projects: mapProjects(projectsResult.data ?? []),
    };
  }

  const latestJobBySpace = new Map<string, string>();
  for (const job of jobsResult.data ?? []) {
    if (!latestJobBySpace.has(job.space_id)) {
      latestJobBySpace.set(job.space_id, job.status);
    }
  }

  // Spaces that actually hold a capture. Empty "draft" quick-scan shells (created when a
  // capture flow is opened but abandoned) have no capture and no job — they must NOT show
  // as scans, and definitely not as "PROCESSING". Filter them out of My Twins entirely.
  const spacesWithCapture = new Set<string>();
  const spacesUploading = new Set<string>();
  for (const row of capturesResult.data ?? []) {
    if (!row.space_id) continue;
    spacesWithCapture.add(row.space_id as string);
    if (row.capture_status === "uploading") spacesUploading.add(row.space_id as string);
  }

  const readyModelsBySpace = new Map<string, number>();
  for (const row of modelsResult.data ?? []) {
    if (!row.space_id) continue;
    readyModelsBySpace.set(row.space_id, (readyModelsBySpace.get(row.space_id) ?? 0) + 1);
  }

  const twins: HubTwin[] = ((spacesResult.data ?? []) as SpaceRow[])
    .filter((space) => {
      // Keep a space if it has a real capture, has a processing job, or has advanced
      // past draft (ready/processing/failed). Drop bare draft shells with nothing in them.
      if (spacesWithCapture.has(space.id)) return true;
      if (latestJobBySpace.has(space.id)) return true;
      return space.status !== "draft" && space.status !== "capturing";
    })
    .map((space) => {
      const project = resolveProject(space.projects);
      const latestJobStatus = latestJobBySpace.get(space.id) ?? null;
      const readyModels = readyModelsBySpace.get(space.id) ?? 0;
      const hasCapture = spacesWithCapture.has(space.id);
      return {
        id: space.id,
        title: space.title,
        status: space.status,
        statusChip: resolveTwinHubStatusChip(space.status, latestJobStatus),
        projectId: space.project_id,
        projectName: project?.name ?? null,
        updatedAt: space.updated_at,
        readyModels,
        hasCapture,
        hubState: resolveTwinHubState({
          spaceStatus: space.status,
          latestJobStatus,
          hasCapture,
          uploading: spacesUploading.has(space.id),
          readyModels,
        }),
        hasPoster: readPosterRef(space.settings) !== null,
      };
    })
    // Spaces that actually hold models are the reason this list exists — an
    // empty draft shell must never outrank them (LISTING-FIX, 2026-08-07).
    // Within each group, newest activity first. Sort BEFORE the cap so a ready
    // twin at position 25 by recency is promoted instead of dropped.
    .sort(
      (a, b) =>
        Number(b.readyModels > 0) - Number(a.readyModels > 0) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 200);

  return {
    twins,
    projects: mapProjects(projectsResult.data ?? []),
  };
}

function mapProjects(rows: ProjectRow[]): HubTwinProject[] {
  return rows.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    createdAt: project.created_at,
  }));
}

function resolveProject(project: SpaceRow["projects"]) {
  return Array.isArray(project) ? project[0] : project;
}
