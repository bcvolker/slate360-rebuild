import "server-only";

import { getScopedProjectForUser, listScopedProjectsForUser } from "@/lib/projects/access";
import { assemblePortfolioRecords } from "@/lib/vnext/assemble-portfolio";
import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import type { PortfolioProjectExtras, PortfolioProjectRow, PortfolioRecord } from "@/lib/vnext/portfolio-types";

const LOAD_ERROR = "Projects could not be loaded. Check your connection and try again.";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadProjectExtras(
  admin: Awaited<ReturnType<typeof listScopedProjectsForUser>>["admin"],
  projectIds: string[],
): Promise<Record<string, PortfolioProjectExtras>> {
  if (projectIds.length === 0) return {};
  const { data } = await admin
    .from("projects")
    .select("id, thumbnail_url, client_name, address, location, latitude, longitude, is_archived, metadata")
    .in("id", projectIds);

  const extras: Record<string, PortfolioProjectExtras> = {};
  for (const row of data ?? []) {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    extras[row.id] = {
      thumbnailUrl: asString(row.thumbnail_url),
      clientName: asString(row.client_name),
      address: asString(row.address),
      location: asString(row.location),
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
      isArchived: row.is_archived === true,
      city: asString(metadata.city),
      state: asString(metadata.state),
      region: asString(metadata.region),
    };
  }
  return extras;
}

export async function loadClientPortfolio(userId: string): Promise<{
  records: PortfolioRecord[];
  error: string | null;
}> {
  try {
    const { admin, projects, error } = await listScopedProjectsForUser(userId);
    if (error) return { records: [], error: LOAD_ERROR };

    const scoped = projects as PortfolioProjectRow[];
    const ids = scoped.map((project) => project.id);
    const [extrasById, evidenceById] = await Promise.all([
      loadProjectExtras(admin, ids),
      loadPortfolioEvidence(admin, ids),
    ]);

    return {
      records: assemblePortfolioRecords({ scopedProjects: scoped, extrasById, evidenceById }),
      error: null,
    };
  } catch {
    return { records: [], error: LOAD_ERROR };
  }
}

export async function loadClientProjectScaffold(
  userId: string,
  projectId: string,
): Promise<{ id: string; name: string } | null> {
  const { project } = await getScopedProjectForUser(userId, projectId, "id, name");
  if (!project) return null;
  const row = project as { id?: string; name?: string };
  if (!row.id || !row.name) return null;
  return { id: row.id, name: row.name };
}
