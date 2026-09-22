import { CAPABILITY_LABEL } from "@/lib/vnext/scope/capabilities";
import { canClientSeeCapability, scopeFromIncluded } from "@/lib/vnext/scope/resolve-client-scope";
import { buildOwnerAttention } from "./attention";
import { clientGroupKey } from "./clients";
import type { OwnerFailureFact, OwnerProjectFact, OwnerProjectSummary, OwnerServiceId, OwnerServiceLine } from "./owner-types";
import { OWNER_SERVICE_IDS } from "./owner-types";

function joinLabels(lines: OwnerServiceLine[], pick: (line: OwnerServiceLine) => boolean): string {
  return lines.filter(pick).map((line) => line.label).join(" · ");
}

export function serviceLinesFor(project: OwnerProjectFact): OwnerServiceLine[] {
  const scope = scopeFromIncluded(project.included);
  return OWNER_SERVICE_IDS.filter((id) => canClientSeeCapability(scope, id)).map((id) => ({
    id,
    label: CAPABILITY_LABEL[id],
    included: true as const,
    internal: project.internal[id],
    clientVisible: project.included.includes(id) && project.clientVisible[id],
  }));
}

export function summarizeOwnerProject(
  project: OwnerProjectFact,
  failures: readonly OwnerFailureFact[],
): OwnerProjectSummary {
  const lines = serviceLinesFor(project);
  const attention = buildOwnerAttention([project], failures)[0] ?? null;
  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    location: project.location,
    thumbnailUrl: project.thumbnailUrl,
    documentedAt: project.documentedAt,
    archived: project.archived || (project.status ?? "").toLowerCase() === "archived",
    includedLabel: joinLabels(lines, () => true),
    visibleLabel: joinLabels(lines, (line) => line.clientVisible),
    serviceLines: lines,
    attentionTitle: attention?.title ?? null,
    projectHref: `/vnext/projects/${project.id}`,
    detailHref: `/vnext/ops/projects/${project.id}`,
  };
}

export function summarizeOwnerProjects(
  projects: readonly OwnerProjectFact[],
  failures: readonly OwnerFailureFact[],
): OwnerProjectSummary[] {
  return projects
    .filter((project) => (project.status ?? "").toLowerCase() !== "deleted")
    .map((project) => summarizeOwnerProject(project, failures.filter((failure) => failure.projectId === project.id)))
    .sort((a, b) => (b.documentedAt ?? "").localeCompare(a.documentedAt ?? "") || a.name.localeCompare(b.name));
}

export type OwnerProjectQuery = {
  q?: string | null;
  client?: string | null;
  attentionOnly?: boolean;
  archived?: boolean;
};

export function filterOwnerProjects(
  projects: readonly OwnerProjectSummary[],
  query: OwnerProjectQuery,
): OwnerProjectSummary[] {
  const q = (query.q ?? "").trim().toLocaleLowerCase();
  const client = clientGroupKey(query.client);
  return projects.filter((project) => {
    if (query.archived ? !project.archived : project.archived) return false;
    if (query.attentionOnly && !project.attentionTitle) return false;
    if (client && clientGroupKey(project.clientName) !== client) return false;
    if (!q) return true;
    const haystack = [project.name, project.clientName ?? "", project.location ?? ""].join(" ").toLocaleLowerCase();
    return haystack.includes(q);
  });
}

export function serviceStateLabel(line: OwnerServiceLine): string {
  if (line.clientVisible) return "Client visible";
  if (line.internal) return "Ready internally";
  return "Not ready";
}

export function isOwnerServiceId(value: string): value is OwnerServiceId {
  return (OWNER_SERVICE_IDS as readonly string[]).includes(value);
}
