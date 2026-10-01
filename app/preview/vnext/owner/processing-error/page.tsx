import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextProcessingBoard } from "@/components/vnext/owner/VnextProcessingBoard";
import { PREVIEW_PROCESSING_ROWS } from "@/lib/vnext/ops/preview-release-fixtures";

export default function PreviewProcessingErrorPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/processing">
      <VnextProcessingBoard rows={PREVIEW_PROCESSING_ROWS.filter((row) => row.status === "failed")} error="Some processing records could not be loaded." />
    </VnextOwnerShell>
  );
}
