import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { ITEMS_LOAD_ERROR } from "@/lib/vnext/items/item-language";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextItemsErrorPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[2].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Items</h1>
        <VnextOverviewErrorNotice message={ITEMS_LOAD_ERROR} />
      </div>
    </VnextClientShell>
  );
}
