"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import { PREVIEW_OVERVIEW_NAV_PATH, PREVIEW_OVERVIEW_PROJECT } from "@/lib/vnext/preview-overview-fixtures";

const LOAD_ERROR = "This project could not be loaded. Check your connection and try again.";

export default function PreviewVnextProjectErrorPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav projectId={PREVIEW_OVERVIEW_PROJECT.id} pathname={PREVIEW_OVERVIEW_NAV_PATH} />
      <VnextProjectOverview
        overview={{
          ...PREVIEW_OVERVIEW_PROJECT,
          latestVisit: null,
          representations: [],
          recentItems: [],
          recentDocuments: [],
        }}
        loadError={LOAD_ERROR}
      />
    </VnextClientShell>
  );
}
