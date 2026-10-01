import { notFound } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextHistoryVisit } from "@/components/vnext/history/VnextHistoryVisit";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_HISTORY_BASE, previewVisit } from "@/lib/vnext/preview-history-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

type PageProps = { params: Promise<{ visitId: string }> };

export default async function PreviewVnextHistoryVisitPage({ params }: PageProps) {
  const { visitId } = await params;
  const visit = previewVisit(visitId);
  if (!visit) notFound();
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[4].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextHistoryVisit visit={visit} historyHref={PREVIEW_HISTORY_BASE} />
    </VnextClientShell>
  );
}
