export function decideVnextProjectRecordAccess(project: { id: string } | null | undefined): "allow" | "not-found" {
  if (!project?.id) return "not-found";
  return "allow";
}

export function filterToAccessibleProjectIds<T extends { id: string }>(
  projects: T[],
  accessibleIds: Iterable<string>,
): T[] {
  const allowed = new Set(accessibleIds);
  return projects.filter((project) => allowed.has(project.id));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVnextProjectId(value: string): boolean {
  return UUID_RE.test(value);
}
