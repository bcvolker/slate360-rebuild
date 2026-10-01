"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[0].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextProjectOverview overview={PREVIEW_OVERVIEW_PROJECT} />
    </VnextClientShell>
  );
}
