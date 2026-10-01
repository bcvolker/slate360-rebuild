import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextDocumentsBrowser } from "@/components/vnext/documents/VnextDocumentsBrowser";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { DOCUMENTS_LOAD_ERROR } from "@/lib/vnext/documents/document-language";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextDocumentsErrorPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[3].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextDocumentsBrowser
        documents={[]}
        hits={[]}
        folders={[]}
        documentsBase="/preview/vnext/project/documents"
        error={DOCUMENTS_LOAD_ERROR}
      />
    </VnextClientShell>
  );
}
