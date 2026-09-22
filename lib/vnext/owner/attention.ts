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

/**
 * A failed capture, plan, or thermal job is attention.
 * A service that was never included is not attention, and neither is an unreviewed
 * capture: review_status defaults to pending and nothing in the product clears it.
 */
export function buildOwnerAttention(
  projects: readonly OwnerProjectFact[],
  failures: readonly OwnerFailureFact[],
): OwnerAttentionItem[] {
  const byId = new Map(projects.filter(active).map((project) => [project.id, project]));
  const items: OwnerAttentionItem[] = [];
  for (const failure of failures) {
    const project = byId.get(failure.projectId);
    if (!project) continue;
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
