import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextHistoryBrowser } from "@/components/vnext/history/VnextHistoryBrowser";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_HISTORY_BASE, PREVIEW_VISITS } from "@/lib/vnext/preview-history-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectHistoryPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[4].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextHistoryBrowser visits={PREVIEW_VISITS} historyBase={PREVIEW_HISTORY_BASE} />
    </VnextClientShell>
  );
}
