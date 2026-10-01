import "server-only";

import { listScopedProjectsForUser, getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation } from "@/lib/projects/location";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { readClientScope, readClientScopes } from "@/lib/vnext/scope/read-project-scope";
import { buildOwnerAttention } from "./attention";
import { applyGroupedClientNames, groupOwnerClients } from "./clients";
import type { OwnerAttentionItem, OwnerClientSummary, OwnerProjectFact, OwnerProjectSummary } from "./owner-types";
import { emptyPresence } from "./owner-types";
import { summarizeOwnerProjects } from "./project-summary";
import { loadQaQueue } from "@/lib/vnext/ops/load-qa";
import { releaseFactsFromQa } from "@/lib/vnext/ops/qa-model";
import { readOwnerSignals } from "./read-owner-signals";

const LOAD_ERROR = "Projects could not be loaded. Check your connection and try again.";

type ProjectRow = {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  status: string | null;
  org_id: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type OwnerWorkspace = {
  projects: OwnerProjectSummary[];
  attention: OwnerAttentionItem[];
  clients: OwnerClientSummary[];
  error: string | null;
};

export async function loadOwnerWorkspace(userId: string): Promise<OwnerWorkspace> {
  try {
    const { admin, projects, error } = await listScopedProjectsForUser(userId);
    if (error) return { projects: [], attention: [], clients: [], error: LOAD_ERROR };
    const scoped = projects as ProjectRow[];
    const ids = scoped.map((project) => project.id);
    if (ids.length === 0) return { projects: [], attention: [], clients: [], error: null };
    const [extras, scopes, signals] = await Promise.all([
      admin.from("projects").select("id, thumbnail_url, client_name, address, location, is_archived, metadata").in("id", ids),
      readClientScopes(admin, ids),
      readOwnerSignals(admin, ids),
    ]);
    const extraById = new Map((extras.data ?? []).map((row: { id: string }) => [row.id, row]));
    const facts: OwnerProjectFact[] = scoped.map((project) => {
      const extra = extraById.get(project.id) as {
        thumbnail_url?: string | null;
        client_name?: string | null;
        address?: string | null;
        location?: string | null;
        is_archived?: boolean;
        metadata?: Record<string, unknown> | null;
      } | undefined;
      const metadata = extra?.metadata && typeof extra.metadata === "object" ? extra.metadata : project.metadata;
      const location = resolveProjectLocation(metadata, {
        fallbackAddress: asString(extra?.address),
        legacyLocation: asString(extra?.location),
      });
      const scope = scopes.get(project.id);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        archived: extra?.is_archived === true,
        clientName: asString(extra?.client_name),
        location: location.label.trim() || null,
        thumbnailUrl: asString(extra?.thumbnail_url) ?? signals.thumbnailUrl[project.id] ?? null,
        documentedAt: signals.documentedAt[project.id] ?? null,
        included: scope ? [...scope.included] : [],
        internal: signals.internal[project.id] ?? emptyPresence(),
        clientVisible: signals.clientVisible[project.id] ?? emptyPresence(),
      };
    });
    const queue = await loadQaQueue(admin, facts.map((fact) => ({ id: fact.id, name: fact.name, included: fact.included })));
    const releases = releaseFactsFromQa(queue.items);
    const clients = groupOwnerClients(facts);
    const summaries = applyGroupedClientNames(summarizeOwnerProjects(facts, signals.failures, releases), clients);
    return {
      projects: summaries,
      attention: buildOwnerAttention(facts, signals.failures, releases),
      clients,
      error: queue.error,
    };
  } catch {
    return { projects: [], attention: [], clients: [], error: LOAD_ERROR };
  }
}

export async function loadOwnerProjectDetail(userId: string, projectId: string): Promise<{
  project: OwnerProjectSummary | null;
  included: OwnerProjectFact["included"];
  canWrite: boolean;
  error: string | null;
} | null> {
  const workspace = await loadOwnerWorkspace(userId);
  if (workspace.error) return { project: null, included: [], canWrite: false, error: workspace.error };
  const project = workspace.projects.find((entry) => entry.id === projectId);
  if (!project) return null;
  const { admin, project: scoped } = await getScopedProjectForUser(userId, projectId, "id, org_id");
  if (!scoped) return null;
  const orgId = (scoped as { org_id?: string | null }).org_id ?? null;
  const scope = await readClientScope(admin, projectId);
  const canWrite = await userCanManageVnextProject(admin, userId, projectId, orgId);
  return { project, included: [...scope.included], canWrite, error: null };
}
