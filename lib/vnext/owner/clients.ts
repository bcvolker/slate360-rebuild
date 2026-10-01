import type { OwnerClientSummary, OwnerProjectFact, OwnerProjectSummary } from "./owner-types";

/** Collapse space and case. Legal suffixes and punctuation stay, so similar names are not merged. */
export function clientGroupKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const compact = name.trim().replace(/\s+/g, " ");
  if (!compact) return null;
  return compact.toLocaleLowerCase();
}

export function clientDetailHref(key: string, base = "/vnext/ops/clients"): string {
  return `${base}/${encodeURIComponent(key)}`;
}

export function groupOwnerClients(
  projects: readonly OwnerProjectFact[],
  base = "/vnext/ops/clients",
): OwnerClientSummary[] {
  const groups = new Map<string, { name: string; projects: OwnerProjectFact[] }>();
  for (const project of projects) {
    if (project.archived || (project.status ?? "").toLowerCase() === "deleted") continue;
    const key = clientGroupKey(project.clientName);
    if (!key || !project.clientName) continue;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { name: project.clientName.trim().replace(/\s+/g, " "), projects: [project] });
      continue;
    }
    current.projects.push(project);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const recent = [...group.projects].sort((a, b) => (b.documentedAt ?? "").localeCompare(a.documentedAt ?? ""))[0];
      return {
        key,
        name: group.name,
        projectCount: group.projects.length,
        recentProjectName: recent?.name ?? group.projects[0]!.name,
        recentAt: recent?.documentedAt ?? null,
        href: clientDetailHref(key, base),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Use the grouped spelling on project rows so "UCL" and "ucl" read as one client. */
export function applyGroupedClientNames(
  projects: readonly OwnerProjectSummary[],
  clients: readonly OwnerClientSummary[],
): OwnerProjectSummary[] {
  const names = new Map(clients.map((client) => [client.key, client.name]));
  return projects.map((project) => {
    const key = clientGroupKey(project.clientName);
    const name = key ? names.get(key) : null;
    if (!name || name === project.clientName) return project;
    return { ...project, clientName: name };
  });
}

export function projectsForClient(projects: readonly OwnerProjectSummary[], key: string): OwnerProjectSummary[] {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return [];
  }
  const wanted = clientGroupKey(decoded);
  if (!wanted) return [];
  return projects.filter((project) => !project.archived && clientGroupKey(project.clientName) === wanted);
}
