import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextShareBoard } from "@/components/vnext/share/VnextShareBoard";
import { PREVIEW_SHARE_LINKS, PREVIEW_SHARE_PROJECTS, PREVIEW_SHARE_VIEWS } from "@/lib/vnext/share/preview-share-fixtures";

export default function PreviewSharesPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops/shares">
      <VnextShareBoard
        projects={PREVIEW_SHARE_PROJECTS}
        views={PREVIEW_SHARE_VIEWS}
        links={PREVIEW_SHARE_LINKS}
        error={null}
        mode="preview"
      />
    </VnextOwnerShell>
  );
}
