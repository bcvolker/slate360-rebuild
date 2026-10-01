import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextProcessingBoard } from "@/components/vnext/owner/VnextProcessingBoard";

export default function PreviewProcessingEmptyPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/processing">
      <VnextProcessingBoard rows={[]} error={null} />
    </VnextOwnerShell>
  );
}
