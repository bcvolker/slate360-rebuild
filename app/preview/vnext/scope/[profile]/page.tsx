import { notFound } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextHistoryBrowser } from "@/components/vnext/history/VnextHistoryBrowser";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import { PREVIEW_HISTORY_BASE } from "@/lib/vnext/preview-history-fixtures";
import { PREVIEW_OVERVIEW_NAV_PATH } from "@/lib/vnext/preview-overview-fixtures";
import { previewScopeView } from "@/lib/vnext/scope/preview-profiles";

type PageProps = { params: Promise<{ profile: string }> };

export default async function PreviewScopePage({ params }: PageProps) {
  const { profile } = await params;
  const view = previewScopeView(profile);
  if (!view) notFound();
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav projectId={view.overview.id} pathname={view.nav[0]?.href} items={view.nav} />
      <VnextProjectOverview overview={view.overview} />
      <VnextHistoryBrowser visits={view.visits} historyBase={PREVIEW_HISTORY_BASE} allowCompare={view.canCompare} />
    </VnextClientShell>
  );
}
