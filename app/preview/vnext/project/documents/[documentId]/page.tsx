import { notFound } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextDocumentDetail } from "@/components/vnext/documents/VnextDocumentDetail";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_DOCUMENTS_BASE, previewDocument } from "@/lib/vnext/preview-documents-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

type PageProps = { params: Promise<{ documentId: string }> };

export default async function PreviewVnextDocumentPage({ params }: PageProps) {
  const { documentId } = await params;
  const document = previewDocument(documentId);
  if (!document) notFound();
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[3].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextDocumentDetail document={document} documentsHref={PREVIEW_DOCUMENTS_BASE} />
    </VnextClientShell>
  );
}
