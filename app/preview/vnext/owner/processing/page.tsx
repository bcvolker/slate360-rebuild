import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextProcessingBoard } from "@/components/vnext/owner/VnextProcessingBoard";
import { PREVIEW_PROCESSING_ROWS } from "@/lib/vnext/ops/preview-release-fixtures";

export default function PreviewProcessingPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/processing">
      <VnextProcessingBoard rows={PREVIEW_PROCESSING_ROWS} error={null} />
    </VnextOwnerShell>
  );
}
