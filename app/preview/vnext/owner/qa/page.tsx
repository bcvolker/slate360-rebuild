import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextQaBoard } from "@/components/vnext/owner/VnextQaBoard";
import { PREVIEW_QA_ITEMS } from "@/lib/vnext/ops/preview-release-fixtures";

export default function PreviewQaPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/qa">
      <VnextQaBoard items={PREVIEW_QA_ITEMS} error={null} />
    </VnextOwnerShell>
  );
}
