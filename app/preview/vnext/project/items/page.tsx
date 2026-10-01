import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextItemsBrowser } from "@/components/vnext/items/VnextItemsBrowser";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_EXPLORE_BASE,
  PREVIEW_ITEMS,
  PREVIEW_ITEMS_BASE,
} from "@/lib/vnext/preview-items-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectItemsPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[2].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextItemsBrowser items={PREVIEW_ITEMS} itemsBase={PREVIEW_ITEMS_BASE} exploreBase={PREVIEW_EXPLORE_BASE} />
    </VnextClientShell>
  );
}
