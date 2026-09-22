import type { OwnerAttentionItem, OwnerFailureFact, OwnerProjectFact } from "./owner-types";

function active(project: OwnerProjectFact): boolean {
  if (project.archived) return false;
  const status = (project.status ?? "").trim().toLowerCase();
  return status !== "archived" && status !== "deleted";
}

function titleFor(failure: OwnerFailureFact): string {
  const name = failure.title.trim();
  if (failure.kind === "plan") return `${name || "A plan"} could not be prepared`;
  if (failure.kind === "thermal") return `${name || "Thermal processing"} failed`;
  return `${name || "A reconstruction"} failed`;
}

function destination(projectId: string, kind: OwnerFailureFact["kind"]): string {
  if (kind === "plan") return `/vnext/projects/${projectId}/documents`;
  return `/vnext/projects/${projectId}`;
}

function included(project: OwnerProjectFact, id: OwnerProjectFact["included"][number]): boolean {
  return project.included.includes(id);
}

/**
 * A failed job is delivery attention only when the project includes a service
 * that job can produce. The processing row itself is left untouched.
 *
 * plan → plans
 * thermal → thermal
 * capture → reality or geometry. A failed digital_twin_captures row has no
 * model format, and that capture can become a splat or a mesh. It does not
 * feed 360, plans, or thermal. Those come from other tables.
 */
export function failureIsRelevantToIncludedScope(project: OwnerProjectFact, failure: OwnerFailureFact): boolean {
  if (failure.kind === "plan") return included(project, "plans");
  if (failure.kind === "thermal") return included(project, "thermal");
  return included(project, "reality") || included(project, "geometry");
}

/**
 * Home and project attention share this list. review_status is not used:
 * it defaults to pending and nothing in the product clears it.
 */
export function buildOwnerAttention(
  projects: readonly OwnerProjectFact[],
  failures: readonly OwnerFailureFact[],
): OwnerAttentionItem[] {
  const byId = new Map(projects.filter(active).map((project) => [project.id, project]));
  const items: OwnerAttentionItem[] = [];
  for (const failure of failures) {
    const project = byId.get(failure.projectId);
    if (!project || !failureIsRelevantToIncludedScope(project, failure)) continue;
    items.push({
      id: `${failure.kind}-${failure.id}`,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      kind: "processing_failed",
      title: titleFor(failure),
      destinationHref: destination(project.id, failure.kind),
      occurredAt: failure.occurredAt,
    });
  }
  return items.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""));
}
