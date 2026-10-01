import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextDocumentsBrowser } from "@/components/vnext/documents/VnextDocumentsBrowser";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_DOCUMENT_FOLDERS,
  PREVIEW_DOCUMENT_HITS,
  PREVIEW_DOCUMENTS,
  PREVIEW_DOCUMENTS_BASE,
  PREVIEW_PLAN_SETS,
} from "@/lib/vnext/preview-documents-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectPlansPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[3].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextDocumentsBrowser
        documents={PREVIEW_DOCUMENTS}
        hits={PREVIEW_DOCUMENT_HITS}
        folders={PREVIEW_DOCUMENT_FOLDERS}
        documentsBase={PREVIEW_DOCUMENTS_BASE}
        planSets={PREVIEW_PLAN_SETS}
        canUploadPlans={false}
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
      />
    </VnextClientShell>
  );
}
