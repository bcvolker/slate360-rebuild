import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextDocumentsLoading } from "@/components/vnext/documents/VnextDocumentsLoading";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextDocumentsLoadingPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[3].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextDocumentsLoading />
    </VnextClientShell>
  );
}
