"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VnextProjectOverviewLoading } from "@/components/vnext/project/VnextProjectOverviewLoading";
import { PREVIEW_OVERVIEW_NAV_PATH, PREVIEW_OVERVIEW_PROJECT } from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectLoadingPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav projectId={PREVIEW_OVERVIEW_PROJECT.id} pathname={PREVIEW_OVERVIEW_NAV_PATH} />
      <VnextProjectOverviewLoading />
    </VnextClientShell>
  );
}
