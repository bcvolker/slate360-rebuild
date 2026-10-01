import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextHistoryLoading } from "@/components/vnext/history/VnextHistoryLoading";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextHistoryLoadingPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav projectId={PREVIEW_OVERVIEW_PROJECT.id} pathname={PREVIEW_PROJECT_NAV_ITEMS[4].href} items={PREVIEW_PROJECT_NAV_ITEMS} />
      <VnextHistoryLoading />
    </VnextClientShell>
  );
}
