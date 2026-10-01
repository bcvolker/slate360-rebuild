import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerHome } from "@/components/vnext/owner/VnextOwnerHome";
import { previewAttentionScopeWorkspace } from "@/lib/vnext/owner/preview-owner";

export default function PreviewAttentionScopePage() {
  const workspace = previewAttentionScopeWorkspace();
  return (
    <VnextOwnerShell pathname="/vnext/ops">
      <VnextOwnerHome attention={workspace.attention} projects={workspace.projects} error={null} />
    </VnextOwnerShell>
  );
}
