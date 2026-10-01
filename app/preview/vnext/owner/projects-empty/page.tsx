import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerProjects } from "@/components/vnext/owner/VnextOwnerProjects";

export default function PreviewOwnerProjectsEmptyPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/projects">
      <VnextOwnerProjects projects={[]} error={null} basePath="/preview/vnext/owner/projects-empty" />
    </VnextOwnerShell>
  );
}
