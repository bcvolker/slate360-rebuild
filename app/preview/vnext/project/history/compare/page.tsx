import { notFound } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextHistoryCompare } from "@/components/vnext/history/VnextHistoryCompare";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_HISTORY_BASE, previewVisit } from "@/lib/vnext/preview-history-fixtures";
import type { VnextCompareRep } from "@/lib/vnext/history/history-types";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

type PageProps = { searchParams: Promise<{ a?: string; b?: string; rep?: string }> };

export default async function PreviewVnextHistoryComparePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const earlier = query.a ? previewVisit(query.a) : null;
  const later = query.b ? previewVisit(query.b) : null;
  if (!earlier || !later) notFound();
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[4].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextHistoryCompare
        earlier={earlier}
        later={later}
        historyHref={PREVIEW_HISTORY_BASE}
        rep={(query.rep as VnextCompareRep | undefined) ?? "reality"}
      />
    </VnextClientShell>
  );
}
