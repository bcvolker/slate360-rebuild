import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerHome } from "@/components/vnext/owner/VnextOwnerHome";
import { previewOwnerWorkspace } from "@/lib/vnext/owner/preview-owner";

export default function PreviewOwnerClearPage() {
  const workspace = previewOwnerWorkspace("/preview/vnext/owner/clients", []);
  return (
    <VnextOwnerShell pathname="/vnext/ops">
      <VnextOwnerHome attention={workspace.attention} projects={workspace.projects} error={null} />
    </VnextOwnerShell>
  );
}
