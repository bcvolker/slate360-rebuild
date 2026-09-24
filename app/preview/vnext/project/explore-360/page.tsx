"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_EXPLORE_360 } from "@/lib/vnext/preview-explore-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectExplore360Page() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[1].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextExploreShell
        data={PREVIEW_EXPLORE_360}
        initialPresent={false}
        basePath="/preview/vnext/project/explore-360"
        item={null}
      />
    </VnextClientShell>
  );
}
