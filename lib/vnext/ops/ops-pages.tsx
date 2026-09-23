import "server-only";

import { notFound } from "next/navigation";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextExploreViewerStage } from "@/components/vnext/explore/VnextExploreViewerStage";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextClientPreviewFrame } from "@/components/vnext/owner/VnextClientPreviewFrame";
import { VnextProcessingBoard } from "@/components/vnext/owner/VnextProcessingBoard";
import { VnextQaBoard } from "@/components/vnext/owner/VnextQaBoard";
import { VnextReleaseActions } from "@/components/vnext/owner/VnextReleaseActions";
import { VnextScopedProjectNav } from "@/components/vnext/project/VnextScopedProjectNav";
import { getScopedProjectForUser, listScopedProjectsForUser } from "@/lib/projects/access";
import { readClientScopes } from "@/lib/vnext/scope/read-project-scope";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";
import { isReleaseRepresentation } from "@/lib/vnext/release/release-rules";
import { loadOwnerClientPreview, loadOwnerSourcePreview } from "./client-preview";
import { loadProcessingQueue } from "./load-processing";
import { loadQaQueue } from "./load-qa";
import { representationLabel } from "./qa-model";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

const EXPLORE: Record<string, VnextExploreRepresentation> = {
  reality: "reality",
  geometry: "geometry",
  pano360: "360",
  plans: "plan",
  thermal: "thermal",
};

async function scopedProjects(userId: string) {
  const listed = await listScopedProjectsForUser(userId);
  const projects = (listed.projects as { id: string; name: string }[]) ?? [];
  return { admin: listed.admin, projects, error: listed.error };
}

export async function renderProcessingPage() {
  const ctx = await requireVnextOwner("/vnext/ops/processing");
  if (!ctx.user) notFound();
  const listed = await scopedProjects(ctx.user.id);
  if (listed.error) return <VnextProcessingBoard rows={[]} error="Processing could not be loaded." />;
  const queue = await loadProcessingQueue(listed.admin, listed.projects);
  return <VnextProcessingBoard rows={queue.rows} error={queue.error} />;
}

export async function renderQaPage() {
  const ctx = await requireVnextOwner("/vnext/ops/qa");
  if (!ctx.user) notFound();
  const listed = await scopedProjects(ctx.user.id);
  if (listed.error) return <VnextQaBoard items={[]} error="Review records could not be loaded." />;
  const scopes = await readClientScopes(listed.admin, listed.projects.map((project) => project.id));
  const queue = await loadQaQueue(
    listed.admin,
    listed.projects.map((project) => ({ id: project.id, name: project.name, included: [...(scopes.get(project.id)?.included ?? [])] })),
  );
  return <VnextQaBoard items={queue.items} error={queue.error} />;
}

export async function renderQaDetailPage(projectId: string, representation: string, sourceId: string) {
  const ctx = await requireVnextOwner(`/vnext/ops/qa/${projectId}/${representation}/${sourceId}`);
  if (!ctx.user || !isReleaseRepresentation(representation)) notFound();
  const listed = await scopedProjects(ctx.user.id);
  const project = listed.projects.find((entry) => entry.id === projectId);
  if (!project) notFound();
  const scopes = await readClientScopes(listed.admin, [projectId]);
  const queue = await loadQaQueue(listed.admin, [{ id: project.id, name: project.name, included: [...(scopes.get(project.id)?.included ?? [])] }]);
  const item = queue.items.find((entry) => entry.representation === representation && entry.sourceId === sourceId);
  if (!item) notFound();
  const preview = await loadOwnerSourcePreview(listed.admin, projectId, item.representation, sourceId);
  const rep = EXPLORE[item.representation];
  return (
    <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold text-[var(--vnext-ink)]">{item.projectName}</h1>
      <p className="mt-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
        {representationLabel(item.representation)} · {item.version ?? item.occurredAt ?? item.title} · {item.bucket === "published" ? "Published" : item.bucket === "rejected" ? "Rejected" : item.bucket === "ready_to_publish" ? "Approved" : "Needs review"}
      </p>
      {item.note ? <p className="mt-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{item.note}</p> : null}
      <div className="mt-4 h-[70dvh] min-h-96 w-full">{preview && rep ? <VnextExploreViewerStage representation={rep} data={preview} /> : <p className="text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">This source cannot be opened yet.</p>}</div>
      <VnextReleaseActions projectId={projectId} projectName={item.projectName} representation={item.representation} representationLabel={representationLabel(item.representation)} sourceId={sourceId} version={item.version ?? item.occurredAt} published={item.bucket === "published"} />
      <a className="mt-3 inline-flex h-11 min-w-11 items-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" href={`/vnext/ops/projects/${projectId}/client-preview/${item.representation}/${sourceId}`}>Preview as client</a>
    </div>
  );
}

export async function renderClientPreviewPage(projectId: string, candidate: { representation: string; sourceId: string } | null) {
  const path = candidate
    ? `/vnext/ops/projects/${projectId}/client-preview/${candidate.representation}/${candidate.sourceId}`
    : `/vnext/ops/projects/${projectId}/client-preview`;
  const ctx = await requireVnextOwner(path);
  if (!ctx.user) notFound();
  const scoped = await getScopedProjectForUser(ctx.user.id, projectId, "id, name");
  if (!scoped.project) notFound();
  const data = await loadOwnerClientPreview(ctx.user.id, scoped.admin, projectId, candidate);
  if (!data) notFound();
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextClientPreviewFrame exitHref={`/vnext/ops/projects/${projectId}`} candidate={candidate ? `${candidate.representation} ${candidate.sourceId}` : null}>
        <VnextScopedProjectNav projectId={projectId} />
        <VnextExploreShell data={data} initialPresent={false} basePath={`/vnext/projects/${projectId}/explore`} item={null} canWrite={false} persistViews="local" views={[]} />
      </VnextClientPreviewFrame>
    </VnextClientShell>
  );
}
