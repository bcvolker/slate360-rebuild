import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerClients } from "@/components/vnext/owner/VnextOwnerClients";

export default function PreviewOwnerClientsEmptyPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/clients">
      <VnextOwnerClients clients={[]} error={null} />
    </VnextOwnerShell>
  );
}
