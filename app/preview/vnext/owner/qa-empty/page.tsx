import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextQaBoard } from "@/components/vnext/owner/VnextQaBoard";

export default function PreviewQaEmptyPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/qa">
      <VnextQaBoard items={[]} error={null} />
    </VnextOwnerShell>
  );
}
