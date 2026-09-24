"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_EXPLORE_EMPTY } from "@/lib/vnext/preview-explore-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectExploreEmptyPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[1].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextExploreShell
        data={PREVIEW_EXPLORE_EMPTY}
        initialPresent={false}
        basePath="/preview/vnext/project/explore-empty"
        item={null}
      />
    </VnextClientShell>
  );
}
