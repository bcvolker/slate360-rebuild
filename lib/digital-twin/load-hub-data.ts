import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { resolveTwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";

type SpaceRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  updated_at: string;
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

  const [spacesResult, projectsResult, jobsResult] = await Promise.all([
    admin
      .from("digital_twin_spaces")
      .select("id, title, status, project_id, updated_at, projects(name)")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(24),
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

  const twins: HubTwin[] = ((spacesResult.data ?? []) as SpaceRow[]).map((space) => {
    const project = resolveProject(space.projects);
    const latestJobStatus = latestJobBySpace.get(space.id) ?? null;
    return {
      id: space.id,
      title: space.title,
      status: space.status,
      statusChip: resolveTwinHubStatusChip(space.status, latestJobStatus),
      projectId: space.project_id,
      projectName: project?.name ?? null,
      updatedAt: space.updated_at,
    };
  });

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
