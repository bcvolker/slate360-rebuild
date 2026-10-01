import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerClients } from "@/components/vnext/owner/VnextOwnerClients";
import { previewOwnerWorkspace } from "@/lib/vnext/owner/preview-owner";

export default function PreviewOwnerClientsPage() {
  const workspace = previewOwnerWorkspace();
  return (
    <VnextOwnerShell pathname="/vnext/ops/clients">
      <VnextOwnerClients clients={workspace.clients} error={null} />
    </VnextOwnerShell>
  );
}
