import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerProjects } from "@/components/vnext/owner/VnextOwnerProjects";
import { previewOwnerWorkspace } from "@/lib/vnext/owner/preview-owner";

export default async function PreviewOwnerProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; client?: string; attention?: string }>;
}) {
  const query = await searchParams;
  const workspace = previewOwnerWorkspace();
  return (
    <VnextOwnerShell pathname="/vnext/ops/projects">
      <VnextOwnerProjects
        projects={workspace.projects}
        error={null}
        initialQuery={query.q ?? ""}
        initialClient={query.client ?? ""}
        initialAttention={query.attention === "1"}
        basePath="/preview/vnext/owner/projects"
      />
    </VnextOwnerShell>
  );
}
