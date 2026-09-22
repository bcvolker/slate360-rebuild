import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextItemsLoading } from "@/components/vnext/items/VnextItemsLoading";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextItemsLoadingPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[2].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextItemsLoading />
    </VnextClientShell>
  );
}
